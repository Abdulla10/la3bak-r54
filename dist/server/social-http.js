import { FunctionalHttpError } from './functional-http.js';
import { can } from './platform.js';
function checked(result) { const r = result; if (r?.ok === false)
    throw new FunctionalHttpError(r.status && r.status >= 400 && r.status <= 599 ? r.status : 400, r.error || 'تعذّر تنفيذ الطلب الاجتماعي.'); return result; }
export function wireSocialRoutes(http, deps) {
    const batchReplay = deps.replayGiftBatch;
    const externalSupport = Object.freeze({ allowExternalSupport: true });
    const giftTargets = (value) => { const values = Array.isArray(value) ? value : [value]; if (values.length < 1 || values.length > 11 || new Set(values).size !== values.length || values.some(v => typeof v !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(v)))
        throw new FunctionalHttpError(400, 'اختر مستلمين صالحين دون تكرار.'); return values.map(v => { const id = deps.resolveGiftTarget(v); if (!id || deps.publicId(id) !== v)
        throw new FunctionalHttpError(404, 'أحد المستلمين غير متاح.'); return id; }); };
    const permission = (actor, perm) => { if (!actor || deps.platform.isBanned(actor.id) || !can(actor.role, perm))
        throw new FunctionalHttpError(403, 'هالصلاحية مب متاحة لحسابك.'); return actor; };
    const resolve = (value) => { if (typeof value !== 'string')
        throw new FunctionalHttpError(400, 'معرّف اللاعب مب صالح.'); const id = deps.resolveTarget(value); if (!id)
        throw new FunctionalHttpError(404, 'الحساب مب موجود.'); return id; };
    const target = (body) => {
        if (body.command === 'challenge:start') {
            const teams = body.teams;
            if (!teams || typeof teams !== 'object' || Array.isArray(teams) || Object.keys(teams).some(k => !['blue', 'red'].includes(k)))
                throw new FunctionalHttpError(400, 'فرق التحدي مب صالحة.');
            const team = (value) => { if (!Array.isArray(value) || value.length < 1 || value.length > 5)
                throw new FunctionalHttpError(400, 'اختر من عضو إلى خمسة لكل فريق.'); return value.map(v => { if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(v))
                throw new FunctionalHttpError(400, 'استخدم معرّف المجتمع العام فقط.'); const id = deps.resolveGiftTarget(v); if (!id || deps.publicId(id) !== v)
                throw new FunctionalHttpError(404, 'عضو التحدي غير متاح.'); return id; }); };
            return { ...body, teams: { blue: team(teams.blue), red: team(teams.red) } };
        }
        // Message/council UUIDs are content references, not account identities.
        if (body.targetId === undefined || body.command === 'report:send' && body.targetType !== 'member')
            return body;
        return { ...body, targetId: resolve(body.targetId) };
    };
    const playerView = (userId, result) => { checked(result); const room = result.room; return { ...result, selfId: deps.publicId(userId), ...(room ? { friendsPresent: deps.presentFriends(userId, Array.isArray(room.members) ? room.members.map(m => m.id) : []) } : {}) }; };
    http.add('GET', '/api/social/rooms', async ({ user }) => playerView(user.id, await deps.rooms.list(user.id)));
    http.add('GET', '/api/social/rooms/:roomId', async ({ user, params }) => playerView(user.id, await deps.rooms.detail(user.id, params.roomId)));
    http.add('GET', '/api/social/config', async ({ user }) => { const r = checked(await deps.rooms.list(user.id)); return { ok: true, selfId: deps.publicId(user.id), config: r.config, preferences: r.preferences }; });
    http.add('POST', '/api/social/rooms/:roomId/gifts/quote', async ({ user, params, body }) => {
        const allowed = ['councilId', 'to', 'gift', 'qty', 'seen', 'seenPolicy'];
        if (Object.keys(body).some(k => !allowed.includes(k)) || typeof body.councilId !== 'string' || typeof body.gift !== 'string' || !body.gift || body.gift.length > 128 || !Number.isSafeInteger(body.qty) || body.qty < 1 || body.qty > 777 || !Number.isSafeInteger(body.seen) || body.seen <= 0 || typeof body.seenPolicy !== 'string' || body.seenPolicy.length > 80)
            throw new FunctionalHttpError(400, 'بيانات عرض الهدية مب صالحة.');
        if (!deps.eligible(user.id) || !deps.quoteGift)
            throw new FunctionalHttpError(403, 'عرض الهدية غير متاح.');
        if (body.to !== undefined) {
            const recipients = giftTargets(body.to);
            return { ...checked(await deps.rooms.withGiftBatchAccess(user.id, params.roomId, body.councilId, recipients, async () => checked(await deps.quoteGift(user, { ...body, to: recipients })), externalSupport)), to: Array.isArray(body.to) ? [...body.to].sort() : [body.to], roomId: params.roomId, councilId: body.councilId };
        }
        const detail = checked(await deps.rooms.detail(user.id, params.roomId));
        if (detail.current?.roomId !== params.roomId || detail.current?.councilId !== body.councilId)
            throw new FunctionalHttpError(403, 'خذ مقعدًا في المجلس الحالي قبل مراجعة العرض.');
        return checked(await deps.quoteGift(user, body));
    });
    http.add('POST', '/api/social/rooms/:roomId/gifts', async ({ user, params, body }) => {
        const allowed = ['councilId', 'to', 'gift', 'qty', 'key', 'seen', 'confirm', 'seenPolicy'];
        if (Object.keys(body).some(k => !allowed.includes(k)) || typeof body.councilId !== 'string' || typeof body.gift !== 'string' || !body.gift || body.gift.length > 128 || typeof body.key !== 'string' || !body.key.trim() || body.key.length > 80 || !Number.isSafeInteger(body.qty) || body.qty < 1 || body.qty > 777 || !Number.isSafeInteger(body.seen) || body.seen <= 0 || body.seenPolicy !== undefined && (typeof body.seenPolicy !== 'string' || body.seenPolicy.length > 80) || body.confirm !== undefined && typeof body.confirm !== 'boolean')
            throw new FunctionalHttpError(400, 'بيانات طلب الهدية مب صالحة.');
        if (!deps.eligible(user.id))
            throw new FunctionalHttpError(403, 'الهدايا غير متاحة لهذا الحساب.');
        const recipients = giftTargets(body.to);
        const payload = { ...body, to: Array.isArray(body.to) ? recipients : recipients[0] }, scope = `social:${params.roomId}:${body.councilId}`;
        const replay = Array.isArray(body.to) ? batchReplay : deps.replayGift;
        if (replay) {
            const previous = await deps.rooms.withGiftReplayAccess(user.id, params.roomId, body.councilId, recipients, () => replay(user, payload, scope));
            if (previous)
                return { ...checked(previous), roomId: params.roomId, councilId: body.councilId };
        }
        if (Array.isArray(body.to)) {
            const result = await deps.rooms.withGiftBatchAccess(user.id, params.roomId, body.councilId, recipients, s => deps.sendGift(user, payload, s), externalSupport);
            return { ...checked(result), roomId: params.roomId, councilId: body.councilId };
        }
        // Gift recipient accepts ONLY the community public identity, never internal/display IDs or names.
        const recipient = recipients[0];
        if (!recipient)
            throw new FunctionalHttpError(404, 'المستلم غير متاح.');
        const result = await deps.rooms.withGiftAccess(user.id, params.roomId, body.councilId, recipient, scope => deps.sendGift(user, { ...body, to: recipient }, scope), externalSupport);
        return { ...checked(result), roomId: params.roomId, councilId: body.councilId };
    });
    http.add('POST', '/api/social/command', async ({ user, body }) => {
        if (typeof body.command !== 'string')
            throw new FunctionalHttpError(400, 'الأمر الاجتماعي مطلوب.');
        if (!deps.eligible(user.id))
            throw new FunctionalHttpError(403, 'القسم الاجتماعي متاح للحسابات المستوفية لضوابط العمر فقط.');
        return checked(await deps.rooms.command(user.id, body.command, target(body)));
    });
    http.add('GET', '/api/social/voice', ({ user }) => {
        if (!deps.eligible(user.id))
            throw new FunctionalHttpError(403, 'القسم الصوتي مب متاح لهالحساب.');
        return checked(deps.voice.ticket(user.id));
    });
    http.add('GET', '/api/admin/social', async ({ actor }) => {
        const a = permission(actor, 'social.view');
        const stats = checked(await deps.rooms.admin(a.id, 'stats', {}));
        const reports = can(a.role, 'social.moderate') ? checked(await deps.rooms.admin(a.id, 'reports:list', {})) : null;
        return { ...stats, reports: reports?.reports ?? reports?.list ?? [], voice: deps.voice.health(), permissions: { view: true, moderate: can(a.role, 'social.moderate'), configure: can(a.role, 'social.configure'), ownership: a.role === 'owner' } };
    }, 'support');
    http.add('POST', '/api/admin/social', async ({ actor, body }) => {
        const commands = ['config:update', 'room:close', 'council:close', 'room:owner', 'room:moderator', 'report:resolve'];
        if (typeof body.command !== 'string' || !commands.includes(body.command))
            throw new FunctionalHttpError(400, 'الأمر الإداري مب مسموح.');
        const config = body.command === 'config:update' || body.command === 'room:owner' || body.command === 'room:moderator';
        const a = permission(actor, config ? 'social.configure' : 'social.moderate');
        if (body.command === 'room:owner' && a.role !== 'owner')
            throw new FunctionalHttpError(403, 'نقل الملكية للمالك الإداري فقط.');
        return checked(await deps.rooms.admin(a.id, body.command, target(body)));
    }, 'support');
    return http;
}
