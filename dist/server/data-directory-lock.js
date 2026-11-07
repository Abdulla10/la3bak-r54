import { closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import path from 'node:path';
const codeOf = (e) => e?.code;
function owner(v) {
    if (!v || typeof v !== 'object')
        return false;
    const o = v;
    return o.v === 1 && Number.isSafeInteger(o.pid) && o.pid > 0 && typeof o.host === 'string' && !!o.host
        && typeof o.token === 'string' && /^[a-f0-9-]{36}$/.test(o.token) && Number.isSafeInteger(o.createdAt) && o.createdAt >= 0;
}
export class DataDirectoryLockedError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'DataDirectoryLockedError';
    }
}
/** قفل محلي اختياري قبل تحميل أي snapshot، ويظل حتى نهاية flush/close. لا يحوّل JSON إلى multiwriter أو distributed store. */
export class DataDirectoryLock {
    directory;
    dir = '';
    held = false;
    ownerToken = '';
    constructor(directory) {
        this.directory = directory;
        if (!directory)
            throw new DataDirectoryLockedError('DATA_DIRECTORY_UNSAFE');
    }
    get token() { return this.ownerToken; }
    get lockFile() { return path.join(this.dir || path.resolve(this.directory), '.la3bak-writer.lock'); }
    checkedDirectory() {
        mkdirSync(this.directory, { recursive: true, mode: 0o700 });
        const st = lstatSync(this.directory);
        if (!st.isDirectory() || st.isSymbolicLink() || (process.platform !== 'win32'
            && ((st.mode & 0o022) !== 0 || (process.getuid && st.uid !== process.getuid())))) {
            throw new DataDirectoryLockedError('DATA_DIRECTORY_UNSAFE');
        }
        this.dir = realpathSync(this.directory);
    }
    /** حارس قصير يمنع تعارض عمليتين أثناء استعادة قفل ميت. لو مات مالكه وسط acquire/release يُرفض تلقائياً، ولا يُسرق الحارس. */
    guarded(fn) {
        const gate = path.join(this.dir, '.la3bak-writer.guard');
        try {
            mkdirSync(gate, { mode: 0o700 });
        }
        catch (e) {
            if (codeOf(e) === 'EEXIST')
                throw new DataDirectoryLockedError('DATA_DIRECTORY_BUSY');
            throw e;
        }
        try {
            return fn();
        }
        finally {
            rmdirSync(gate);
        }
    }
    readOwner() {
        const st = lstatSync(this.lockFile);
        if (!st.isFile() || st.isSymbolicLink() || (process.platform !== 'win32'
            && ((st.mode & 0o077) !== 0 || (process.getuid && st.uid !== process.getuid())))) {
            throw new DataDirectoryLockedError('DATA_DIRECTORY_UNSAFE');
        }
        let v;
        try {
            v = JSON.parse(readFileSync(this.lockFile, 'utf8'));
        }
        catch {
            throw new DataDirectoryLockedError('DATA_DIRECTORY_BUSY');
        }
        if (!owner(v))
            throw new DataDirectoryLockedError('DATA_DIRECTORY_BUSY');
        return v;
    }
    provedDead(o) {
        if (o.host !== hostname())
            return false;
        try {
            process.kill(o.pid, 0);
            return false;
        }
        catch (e) {
            return codeOf(e) === 'ESRCH';
        } // EPERM/unknown = حي أو غير مثبت، لا يُسرق.
    }
    /** يُرجع نفس instance؛ ثاني مالك/قفل أجنبي/حي/تالف يُرفض. الاستعادة تلقائية فقط لنفس hostname وPID ثبت ESRCH. */
    acquire() {
        if (this.held)
            throw new DataDirectoryLockedError('DATA_DIRECTORY_BUSY');
        this.checkedDirectory();
        return this.guarded(() => {
            if (existsSync(this.lockFile)) {
                const old = this.readOwner();
                if (!this.provedDead(old))
                    throw new DataDirectoryLockedError('DATA_DIRECTORY_BUSY');
                unlinkSync(this.lockFile);
            }
            else {
                // existsSync لا يرى dangling symlink؛ lstat يمنع تجاهله أو الكتابة عبره.
                try {
                    lstatSync(this.lockFile);
                    throw new DataDirectoryLockedError('DATA_DIRECTORY_UNSAFE');
                }
                catch (e) {
                    if (codeOf(e) !== 'ENOENT')
                        throw e;
                }
            }
            const next = { v: 1, pid: process.pid, host: hostname(), token: randomUUID(), createdAt: Date.now() };
            const fd = openSync(this.lockFile, 'wx', 0o600);
            try {
                if (!fstatSync(fd).isFile())
                    throw new DataDirectoryLockedError('DATA_DIRECTORY_UNSAFE');
                writeFileSync(fd, JSON.stringify(next));
                fsyncSync(fd);
            }
            catch (e) {
                try {
                    unlinkSync(this.lockFile);
                }
                catch { /* fail closed */ }
                throw e;
            }
            finally {
                closeSync(fd);
            }
            this.ownerToken = next.token;
            this.held = true;
            return this;
        });
    }
    /** true عند التحرير/سبق التحرير؛ false لرمز أو مالك غير مطابق، ولا يحذف قفل غيره. لا تُحرّر قبل انتهاء flush. */
    release(token = this.ownerToken) {
        if (!this.held)
            return !token || token === this.ownerToken;
        if (token !== this.ownerToken)
            return false;
        return this.guarded(() => {
            let current;
            try {
                current = this.readOwner();
            }
            catch (e) {
                if (codeOf(e) === 'ENOENT')
                    return false;
                throw e;
            }
            if (current.token !== token || current.host !== hostname() || current.pid !== process.pid)
                return false;
            unlinkSync(this.lockFile);
            this.held = false;
            return true;
        });
    }
}
