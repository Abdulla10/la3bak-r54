import { createHash } from 'node:crypto';
/**
 * مخزن MariaDB/MySQL. يحفظ الغرفة كاملة JSON في جدول rooms مع رقم إصدار،
 * وجدول room_members للبحث السريع عن غرف اللاعب. البوتات ما تدخل جدول الأعضاء.
 * Apply db/room-creation-security.sql explicitly before using atomic creation;
 * this module never migrates a database at runtime.
 */
export async function createMariaStore(cfg, suppliedPool) {
    let pool = suppliedPool;
    if (!pool) {
        // import ديناميكي عشان الحزمة اختيارية في وضع الذاكرة
        const mysql = await import('mysql2/promise');
        pool = mysql.createPool({
            host: cfg.host,
            port: cfg.port,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
            waitForConnections: true,
            connectionLimit: 10,
            charset: 'utf8mb4',
        });
    }
    const dbPool = pool;
    const parse = (row) => ({ ...(typeof row.data === 'string' ? JSON.parse(row.data) : row.data) });
    const members = (room) => room.players.filter((p) => !p.bot && !p.left).map((p) => p.id);
    async function writeMembers(conn, room) {
        await conn.query('DELETE FROM room_members WHERE code = ?', [room.code]);
        const ids = members(room);
        if (ids.length) {
            await conn.query('INSERT INTO room_members (code, user_id) VALUES ?', [ids.map((id) => [room.code, id])]);
        }
    }
    async function tx(fn) {
        const conn = await dbPool.getConnection();
        try {
            await conn.beginTransaction();
            const out = await fn(conn);
            await conn.commit();
            return out;
        }
        catch (e) {
            await conn.rollback();
            throw e;
        }
        finally {
            conn.release();
        }
    }
    class RoomCodeCollision extends Error {
    }
    async function createRoomAtomic(room, key, fingerprint, limits) {
        const conn = await dbPool.getConnection();
        // SHA-256 yields exactly 64 ASCII characters (MariaDB's lock-name limit).
        // The database namespace avoids unrelated databases blocking each other.
        const lockName = createHash('sha256').update(`room-create:${cfg.database}:${room.hostId}`).digest('hex');
        let locked = false;
        let transactionOpen = false;
        let destroyed = false;
        let collision = false;
        const destroy = () => {
            if (!destroyed) {
                destroyed = true;
                conn.destroy();
            }
        };
        async function createLocked() {
            const [keys] = await conn.query('SELECT fingerprint, code, created_at FROM room_creation_keys WHERE user_id = ? AND request_key = ?', [room.hostId, key]);
            if (keys.length) {
                const previous = keys[0];
                if (previous.fingerprint !== fingerprint)
                    return { kind: 'mismatch' };
                const [rows] = await conn.query('SELECT data FROM rooms WHERE code = ?', [previous.code]);
                if (!rows.length)
                    return { kind: 'gone' };
                const stored = parse(rows[0]);
                // Legacy create() remains unchanged and may reuse a deleted code. Such
                // a different room must never be returned for the tombstoned request.
                if (stored.createdAt !== Number(previous.created_at)
                    || stored.creation?.key !== key || stored.creation?.fingerprint !== fingerprint) {
                    return { kind: 'gone' };
                }
                return { kind: 'replay', room: stored };
            }
            const [hostedRows] = await conn.query('SELECT data FROM rooms WHERE host_id = ?', [room.hostId]);
            const hosted = hostedRows.map(parse);
            if (hosted.length >= limits.maxRooms)
                return { kind: 'room_limit' };
            if (room.mode === 'bots' && hosted.filter((r) => r.mode === 'bots').length >= limits.maxBotRooms) {
                return { kind: 'bot_limit' };
            }
            // Reserve historical creation codes as well as live rooms so a deleted
            // request cannot later resolve to a different atomic creation.
            const [reserved] = await conn.query('SELECT code FROM room_creation_keys WHERE code = ? LIMIT 1', [room.code]);
            if (reserved.length)
                throw new RoomCodeCollision();
            const stored = { ...room, creation: { key, fingerprint } };
            const data = JSON.stringify(stored);
            // Classify duplicates only on the room INSERT, never on member/key writes.
            try {
                await conn.query('INSERT INTO rooms (code, host_id, status, revision, updated_at, data) VALUES (?,?,?,?,?,?)', [stored.code, stored.hostId, stored.status, stored.revision, stored.updatedAt, data]);
            }
            catch (e) {
                if (e?.code === 'ER_DUP_ENTRY')
                    throw new RoomCodeCollision();
                throw e;
            }
            await writeMembers(conn, stored);
            await conn.query('INSERT INTO room_creation_keys (user_id, request_key, fingerprint, code, created_at) VALUES (?,?,?,?,?)', [stored.hostId, key, fingerprint, stored.code, stored.createdAt]);
            return { kind: 'created', room: JSON.parse(data) };
        }
        try {
            await conn.beginTransaction();
            transactionOpen = true;
            let lockRows;
            try {
                [lockRows] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
            }
            catch (e) {
                // A lost response might have acquired the named lock: never pool it.
                destroy();
                transactionOpen = false;
                throw e;
            }
            if (Number(lockRows[0]?.acquired) !== 1)
                throw new Error('room_creation_lock_unavailable');
            locked = true;
            const result = await createLocked();
            await conn.commit();
            transactionOpen = false;
            return result;
        }
        catch (e) {
            if (transactionOpen && !destroyed) {
                try {
                    await conn.rollback();
                    transactionOpen = false;
                }
                catch (rollbackError) {
                    destroy();
                    throw new AggregateError([e, rollbackError], 'room_creation_rollback_failed');
                }
            }
            if (e instanceof RoomCodeCollision)
                collision = true;
            else
                throw e;
        }
        finally {
            if (locked && !destroyed) {
                try {
                    const [rows] = await conn.query('SELECT RELEASE_LOCK(?) AS released', [lockName]);
                    if (Number(rows[0]?.released) !== 1)
                        throw new Error('room_creation_lock_release_failed');
                }
                catch {
                    // Named locks survive COMMIT/ROLLBACK. A failure here is fatal, even
                    // after commit; callers must retry with the same idempotency key.
                    destroy();
                    throw new Error('room_creation_lock_release_failed');
                }
            }
            if (!destroyed)
                conn.release();
        }
        // A collision is returned only after rollback and successful lock cleanup.
        if (collision)
            return { kind: 'collision' };
        throw new Error('room_creation_failed');
    }
    return {
        async get(code) {
            const [rows] = await dbPool.query('SELECT data FROM rooms WHERE code = ?', [code]);
            return rows.length ? parse(rows[0]) : null;
        },
        async create(room) {
            try {
                return await tx(async (conn) => {
                    await conn.query('INSERT INTO rooms (code, host_id, status, revision, updated_at, data) VALUES (?,?,?,?,?,?)', [room.code, room.hostId, room.status, room.revision, room.updatedAt, JSON.stringify(room)]);
                    await writeMembers(conn, room);
                    return true;
                });
            }
            catch (e) {
                if (e?.code === 'ER_DUP_ENTRY')
                    return false;
                throw e;
            }
        },
        createRoomAtomic,
        async update(room, expectedRevision) {
            return tx(async (conn) => {
                const [res] = await conn.query('UPDATE rooms SET host_id=?, status=?, revision=?, updated_at=?, data=? WHERE code=? AND revision=?', [room.hostId, room.status, room.revision, room.updatedAt, JSON.stringify(room), room.code, expectedRevision]);
                if (res.affectedRows !== 1)
                    return false;
                await writeMembers(conn, room);
                return true;
            });
        },
        async delete(code) {
            await dbPool.query('DELETE FROM rooms WHERE code = ?', [code]);
        },
        async listByUser(userId) {
            const [rows] = await dbPool.query('SELECT r.data FROM rooms r JOIN room_members m ON m.code = r.code WHERE m.user_id = ?', [userId]);
            return rows.map(parse);
        },
        async listPlaying() {
            const [rows] = await dbPool.query("SELECT data FROM rooms WHERE status = 'playing'");
            return rows.map(parse);
        },
        async listUpdatedBefore(ts) {
            const [rows] = await dbPool.query('SELECT data FROM rooms WHERE updated_at < ?', [ts]);
            return rows.map(parse);
        },
        async ping() {
            try {
                // Connection-only SELECT 1 would falsely report an unmigrated DB ready.
                await dbPool.query('SELECT 1 FROM room_creation_keys LIMIT 1');
                return true;
            }
            catch {
                return false;
            }
        },
        async close() {
            await dbPool.end();
        },
    };
}
