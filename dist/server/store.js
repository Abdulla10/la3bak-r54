export class MemoryStore {
    rooms = new Map();
    creationKeys = new Map();
    // Historical atomic-creation codes cannot identify a new atomic room.
    creationCodes = new Set();
    copy(r) {
        return structuredClone(r);
    }
    async get(code) {
        const r = this.rooms.get(code);
        return r ? this.copy(r) : null;
    }
    async create(room) {
        if (this.rooms.has(room.code))
            return false;
        this.rooms.set(room.code, this.copy(room));
        return true;
    }
    async createRoomAtomic(room, key, fingerprint, limits) {
        // There is deliberately no await in this critical section: checks and writes
        // execute in one JS turn, even for concurrent calls with different keys.
        const actorKeys = this.creationKeys.get(room.hostId);
        const previous = actorKeys?.get(key);
        if (previous) {
            if (previous.fingerprint !== fingerprint)
                return { kind: 'mismatch' };
            const stored = this.rooms.get(previous.code);
            if (previous.gone || !stored)
                return { kind: 'gone' };
            return { kind: 'replay', room: this.copy(stored) };
        }
        const hosted = [...this.rooms.values()].filter((r) => r.hostId === room.hostId);
        if (hosted.length >= limits.maxRooms)
            return { kind: 'room_limit' };
        if (room.mode === 'bots' && hosted.filter((r) => r.mode === 'bots').length >= limits.maxBotRooms) {
            return { kind: 'bot_limit' };
        }
        if (this.rooms.has(room.code) || this.creationCodes.has(room.code))
            return { kind: 'collision' };
        const stored = this.copy({ ...room, creation: { key, fingerprint } });
        // Clone the result before writing, so an uncloneable payload consumes neither
        // a code nor a key, and callers can never mutate the stored value.
        const result = this.copy(stored);
        const keys = actorKeys ?? new Map();
        keys.set(key, { fingerprint, code: room.code, gone: false });
        this.creationKeys.set(room.hostId, keys);
        this.creationCodes.add(room.code);
        this.rooms.set(room.code, stored);
        return { kind: 'created', room: result };
    }
    async update(room, expectedRevision) {
        const cur = this.rooms.get(room.code);
        if (!cur || cur.revision !== expectedRevision)
            return false;
        this.rooms.set(room.code, this.copy(room));
        return true;
    }
    async delete(code) {
        this.rooms.delete(code);
        for (const keys of this.creationKeys.values()) {
            for (const entry of keys.values())
                if (entry.code === code)
                    entry.gone = true;
        }
    }
    async listByUser(userId) {
        return [...this.rooms.values()]
            .filter((r) => r.players.some((p) => p.id === userId && !p.bot && !p.left))
            .map((r) => this.copy(r));
    }
    async listPlaying() {
        return [...this.rooms.values()].filter((r) => r.status === 'playing').map((r) => this.copy(r));
    }
    async listUpdatedBefore(ts) {
        return [...this.rooms.values()].filter((r) => r.updatedAt < ts).map((r) => this.copy(r));
    }
    async ping() {
        return true;
    }
    async close() { }
}
