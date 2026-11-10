import type http from 'node:http';
import type { Actor } from './admin.js';
import { KeyedLimiter } from './ratelimit.js';
import { StorageError, STORAGE_MSG } from './datafile.js';

export class FunctionalHttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export interface FunctionalContext {
  user: { id: string; name: string };
  actor: Actor | null;
  url: URL;
  params: Record<string, string>;
  body: Record<string, unknown>;
}
type Handler = (ctx: FunctionalContext) => unknown | Promise<unknown>;
interface Route { method: string; pattern: RegExp; names: string[]; handler: Handler; staff: 'owner' | 'support' | null; maxBody?: number }
interface Deps {
  json(res: http.ServerResponse, status: number, body: unknown): void;
  sameOrigin(req: http.IncomingMessage): boolean;
  actorOf(req: http.IncomingMessage, user: { id: string; name: string } | null): Actor | null;
  isBanned(id: string): boolean;
  log(event: string, data?: Record<string, unknown>): void;
}
/** جسر فوق جلسة الموقع القائمة، وليس نظام مصادقة أو توجيه جديدًا. */
export class FunctionalHttp {
  private routes: Route[] = [];
  private prefixes = new Set<string>();
  private fallbackPrefixes = new Set<string>();
  private readLimiter = new KeyedLimiter(180, 3);
  private writeLimiter = new KeyedLimiter(30, 0.5);
  /** R69: حارس عام (زر الطوارئ) — يرجع رسالة لو الطلب لازم ينرفض */
  guard: ((method: string, path: string) => string | null) | null = null;
  constructor(private deps: Deps) {}
  allowFallback(prefix: string) { this.fallbackPrefixes.add(prefix); return this; }
  add(method: string, path: string, handler: Handler, staff: 'owner' | 'support' | null = null, maxBody = 32768) {
    const names: string[] = [];
    const source = path.split('/').map((part) => {
      if (part.startsWith(':')) { names.push(part.slice(1)); return '([^/]+)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    this.routes.push({ method, pattern: new RegExp('^' + source + '$'), names, handler, staff, maxBody });
    this.prefixes.add(path.split('/').slice(0, staff ? 4 : 3).join('/'));
    return this;
  }
  private async body(req: http.IncomingMessage, max = 32768): Promise<Record<string, unknown>> {
    if (Number(req.headers['content-length'] ?? 0) > max) { req.resume(); throw new FunctionalHttpError(413, 'الطلب كبير.'); }
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []; let size = 0; let big = false;
      req.on('data', (chunk: Buffer) => { size += chunk.length; if (size > max) { big = true; chunks.length = 0; } else if (!big) chunks.push(chunk); });
      req.on('end', () => big ? reject(new FunctionalHttpError(413, 'الطلب كبير.')) : resolve(Buffer.concat(chunks)));
      req.on('error', reject); req.on('aborted', () => reject(new FunctionalHttpError(400, 'الطلب لم يكتمل.')));
    });
    try {
      const decoded = bytes.length ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : '{}';
      const d: unknown = JSON.parse(decoded);
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error();
      return d as Record<string, unknown>;
    } catch { throw new FunctionalHttpError(400, 'بيانات الطلب غير صالحة.'); }
  }
  async handle(req: http.IncomingMessage, res: http.ServerResponse, url: URL, user: { id: string; name: string } | null): Promise<boolean> {
    const own = [...this.prefixes].some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
    if (!own) return false;
    try {
      const matched = this.routes.filter((r) => r.pattern.test(url.pathname));
      if (!matched.length && [...this.fallbackPrefixes].some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) return false;
      const route = matched.find((r) => r.method === req.method);
      if (!matched.length) throw new FunctionalHttpError(404, 'المسار غير موجود.');
      if (!route) throw new FunctionalHttpError(405, 'الطريقة غير مسموحة.');
      const actor = route.staff ? this.deps.actorOf(req, user) : null;
      if (route.staff) {
        if (!actor) { const g = (req as unknown as { __admGate?: string }).__admGate;
          if (g === 'need2fa') { this.deps.json(res, 401, { error: 'اكتب رمز التحقق من تطبيق المصادقة عشان تدخل اللوحة.', need2fa: true }); return true; }
          if (g === 'suspended') { this.deps.json(res, 403, { error: 'حسابك موقوف من لوحة التحكم. تواصل مع المالك.', suspended: true }); return true; }
          throw new FunctionalHttpError(401, 'تسجيل الإدارة مطلوب.'); }
        if (route.staff === 'owner' && actor.role !== 'owner') throw new FunctionalHttpError(403, 'الصلاحية للمالك فقط.');
      } else if (!user) throw new FunctionalHttpError(401, 'سجّل دخولك أول.');
      if (user && this.deps.isBanned(user.id)) throw new FunctionalHttpError(403, 'هذا الحساب موقوف.');
      if (!route.staff && this.guard) { const g = this.guard(req.method ?? 'GET', url.pathname); if (g) throw new FunctionalHttpError(423, g); }
      const who = user ?? (actor ? { id: actor.id, name: actor.name } : null);
      if (!who) throw new FunctionalHttpError(401, 'تسجيل الدخول مطلوب.');
      const mut = req.method !== 'GET';
      const limit = mut ? this.writeLimiter : this.readLimiter;
      if (!limit.allow((actor?.id ?? who.id) + ':' + url.pathname.split('/').slice(0, 3).join('/'))) throw new FunctionalHttpError(429, 'طلبات كثيرة، جرّب بعد شوي.');
      let body: Record<string, unknown> = {};
      if (mut) {
        if (!this.deps.sameOrigin(req) || (route.staff && req.headers['x-admin'] !== '1')) throw new FunctionalHttpError(403, 'مصدر الطلب غير مسموح.');
        if (String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new FunctionalHttpError(415, 'المطلوب طلب JSON.');
        body = await this.body(req, route.maxBody ?? 32768);
      }
      const match = route.pattern.exec(url.pathname)!;
      const params: Record<string, string> = {};
      try { route.names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); }); }
      catch { throw new FunctionalHttpError(400, 'الرابط غير صالح.'); }
      const out = await route.handler({ user: who, actor, url, params, body });
      this.deps.json(res, 200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof StorageError) this.deps.json(res, 503, { error: STORAGE_MSG, storage: true });
      else if (e instanceof FunctionalHttpError) this.deps.json(res, e.status, { error: e.message });
      else {
        const candidate = e as { status?: unknown; code?: unknown; message?: unknown };
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
