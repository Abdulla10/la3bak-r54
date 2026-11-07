/** الوعود اللي بدأت وما خلصت بعد تُحسب معلّقة حتى لو أعلام dirty بعدها ما تغيّرت. */
export class PendingWrites {
    pending = new Map();
    has(name) { return this.pending.has(name); }
    stores() { return [...this.pending.keys()]; }
    begin(name) {
        this.pending.set(name, (this.pending.get(name) ?? 0) + 1);
        let done = false;
        return () => {
            if (done)
                return;
            done = true;
            const left = this.pending.get(name) - 1;
            if (left)
                this.pending.set(name, left);
            else
                this.pending.delete(name);
        };
    }
    track(name, work) {
        const finish = this.begin(name);
        try {
            return Promise.resolve(work()).then((value) => { finish(); return value; }, (error) => { finish(); throw error; });
        }
        catch (error) {
            finish();
            return Promise.reject(error);
        }
    }
}
export async function flushUnsaved(timeoutMs, io, clock = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
    const t0 = clock();
    const deadline = t0 + timeoutMs;
    let attempts = 0;
    let u;
    for (;;) {
        io.retry();
        attempts++;
        // نعطي retry سريع فرصة يخلص؛ الوعد البطيء يظل محسوب بدون تعطيل مهلة الإغلاق.
        await sleep(0);
        u = io.unsaved();
        if (!u.pendingPayouts && !u.stores.length)
            break;
        const left = deadline - clock();
        if (left <= 0)
            break;
        await sleep(Math.min(250, left));
    }
    const clean = !u.pendingPayouts && !u.stores.length;
    return { clean, attempts, elapsedMs: clock() - t0, pendingPayouts: u.pendingPayouts, stores: u.stores, storageFailing: io.failing() };
}
