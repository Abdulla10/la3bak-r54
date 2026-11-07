import { KeyedLimiter } from './ratelimit.js';
import { StorageError, STORAGE_MSG } from './datafile.js';
export class FunctionalHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
/** جسر فوق جلسة الموقع القائمة، وليس نظام مصادقة أو توجيه جديدًا. */
export class FunctionalHttp {
    deps;
    routes = [];
    prefixes = new Set();
    fallbackPrefixes = new Set();
    readLimiter = new KeyedLimiter(180, 3);
    writeLimiter = new KeyedLimiter(30, 0.5);
    constructor(deps) {
        this.deps = deps;
    }
    allowFallback(prefix) { this.fallbackPrefixes.add(prefix); return this; }
    add(method, path, handler, staff = null) {
        const names = [];
        const source = path.split('/').map((part) => {
            if (part.startsWith(':')) {
                names.push(part.slice(1));
                return '([^/]+)';
            }
            return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('/');
        this.routes.push({ method, pattern: new RegExp('^' + source + '$'), names, handler, staff });
        this.prefixes.add(path.split('/').slice(0, staff ? 4 : 3).join('/'));
        return this;
    }
    async body(req) {
        if (Number(req.headers['content-length'] ?? 0) > 32768) {
            req.resume();
            throw new FunctionalHttpError(413, 'الطلب كبير.');
        }
        const bytes = await new Promise((resolve, reject) => {
            const chunks = [];
            let size = 0;
            let big = false;
            req.on('data', (chunk) => { size += chunk.length; if (size > 32768) {
                big = true;
                chunks.length = 0;
            }
            else if (!big)
                chunks.push(chunk); });
            req.on('end', () => big ? reject(new FunctionalHttpError(413, 'الطلب كبير.')) : resolve(Buffer.concat(chunks)));
            req.on('error', reject);
            req.on('aborted', () => reject(new FunctionalHttpError(400, 'الطلب لم يكتمل.')));
        });
        try {
            const decoded = bytes.length ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : '{}';
            const d = JSON.parse(decoded);
            if (!d || typeof d !== 'object' || Array.isArray(d))
                throw new Error();
            return d;
        }
        catch {
            throw new FunctionalHttpError(400, 'بيانات الطلب غير صالحة.');
        }
    }
    async handle(req, res, url, user) {
        const own = [...this.prefixes].some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
        if (!own)
            return false;
        try {
            const matched = this.routes.filter((r) => r.pattern.test(url.pathname));
            if (!matched.length && [...this.fallbackPrefixes].some(p => url.pathname === p || url.pathname.startsWith(p + '/')))
                return false;
            const route = matched.find((r) => r.method === req.method);
            if (!matched.length)
                throw new FunctionalHttpError(404, 'المسار غير موجود.');
            if (!route)
                throw new FunctionalHttpError(405, 'الطريقة غير مسموحة.');
            const actor = route.staff ? this.deps.actorOf(req, user) : null;
            if (route.staff) {
                if (!actor)
                    throw new FunctionalHttpError(401, 'تسجيل الإدارة مطلوب.');
                if (route.staff === 'owner' && actor.role !== 'owner')
                    throw new FunctionalHttpError(403, 'الصلاحية للمالك فقط.');
            }
            else if (!user)
                throw new FunctionalHttpError(401, 'سجّل دخولك أول.');
            if (user && this.deps.isBanned(user.id))
                throw new FunctionalHttpError(403, 'هذا الحساب موقوف.');
            const who = user ?? (actor ? { id: actor.id, name: actor.name } : null);
            if (!who)
                throw new FunctionalHttpError(401, 'تسجيل الدخول مطلوب.');
            const mut = req.method !== 'GET';
            const limit = mut ? this.writeLimiter : this.readLimiter;
            if (!limit.allow((actor?.id ?? who.id) + ':' + url.pathname.split('/').slice(0, 3).join('/')))
                throw new FunctionalHttpError(429, 'طلبات كثيرة، جرّب بعد شوي.');
            let body = {};
            if (mut) {
                if (!this.deps.sameOrigin(req) || (route.staff && req.headers['x-admin'] !== '1'))
                    throw new FunctionalHttpError(403, 'مصدر الطلب غير مسموح.');
                if (String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json')
                    throw new FunctionalHttpError(415, 'المطلوب طلب JSON.');
                body = await this.body(req);
            }
            const match = route.pattern.exec(url.pathname);
            const params = {};
            try {
                route.names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
            }
            catch {
                throw new FunctionalHttpError(400, 'الرابط غير صالح.');
            }
            const out = await route.handler({ user: who, actor, url, params, body });
            this.deps.json(res, 200, out ?? { ok: true });
        }
        catch (e) {
            if (e instanceof StorageError)
                this.deps.json(res, 503, { error: STORAGE_MSG, storage: true });
            else if (e instanceof FunctionalHttpError)
                this.deps.json(res, e.status, { error: e.message });
            else {
                const candidate = e;
                const status = typeof candidate.status === 'number' && candidate.status >= 400 && candidate.status <= 499 ? candidate.status : 400;
                // Domain validation errors are safe Arabic messages; unknown failures never expose paths, secrets, or stacks.
                const message = typeof candidate.message === 'string' && /[\u0600-\u06ff]/.test(candidate.message) ? candidate.message : 'الطلب غير صالح أو غير مسموح.';
                this.deps.log('functional_request_rejected', { status });
                this.deps.json(res, status, { error: message });
            }
        }
        return true;
    }
}
