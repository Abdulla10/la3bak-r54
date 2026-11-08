import { randomUUID } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { can } from './platform.js';
export const ACCOUNT_SETTINGS_DEFAULTS = Object.freeze({
    sound: false, notifications: false, showActivity: false, showPresence: false,
    // R55: مؤثرات الهدايا ثلاثية الأبعاد والدخوليات تظهر افتراضيًا (مثل باقي المنصات)، واللاعب يقدر يخفيها من الإعدادات
    hideEntrances: false, hideChatEffects: false,
});
export const ACCOUNT_REASON_MAX = 500;
export const VERIFICATION_GRANT_REASON_MAX = 180;
export class AccountToolsError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'AccountToolsError';
    }
}
const KEYS = Object.keys(ACCOUNT_SETTINGS_DEFAULTS);
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/;
const STATUSES = ['pending', 'accepted', 'rejected', 'revoked'];
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const safeId = (v) => typeof v === 'string' && ID.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
const timestamp = (v) => Number.isSafeInteger(v) && v >= 0;
const only = (v, keys) => Object.keys(v).every(k => keys.includes(k));
const controls = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/;
// لا حقول ملفات/بريد أصلاً؛ تُرفض أيضاً عناوين البريد والروابط/حمولات البيانات في السبب.
const sensitive = /[@＠]|(?:https?:\/\/|www\.|data:|file:|mailto:|-----BEGIN)/i;
function reasonText(v) {
    if (typeof v !== 'string' || v.length > ACCOUNT_REASON_MAX || controls.test(v) || sensitive.test(v))
        throw new AccountToolsError('bad_reason', 'اكتب سببًا نصيًا فقط، دون بريد أو روابط أو مستندات.');
    const s = v.replace(/\s+/g, ' ').trim();
    if (s.length < 3)
        throw new AccountToolsError('bad_reason', 'السبب مطلوب: من 3 إلى 500 حرف.');
    return s;
}
function grantReasonText(v) {
    if (typeof v !== 'string' || v.length > VERIFICATION_GRANT_REASON_MAX)
        throw new AccountToolsError('bad_reason', 'سبب المنح أو الإلغاء: من 3 إلى 180 حرفًا نصيًا فقط.');
    return reasonText(v);
}
const validKind = (kind) => kind === 'standard' || kind === 'administration' || kind === null;
function settingsPatch(raw) {
    if (!isObj(raw) || !only(raw, KEYS) || !Object.keys(raw).length ||
        !Object.values(raw).every(v => typeof v === 'boolean'))
        throw new AccountToolsError('bad_settings', 'الإعدادات تقبل الحقول المحددة وقيمًا منطقية فقط.');
    return { ...raw };
}
function playerId(id) {
    if (!safeId(id))
        throw new AccountToolsError('bad_id', 'معرّف غير صالح.');
    return id;
}
function adminActor(actor) {
    if (!isObj(actor) || !safeId(actor.id) || typeof actor.name !== 'string' || !actor.name.trim() ||
        actor.name.length > 120 || controls.test(actor.name))
        throw new AccountToolsError('bad_actor', 'بيانات المنفّذ غير صالحة.');
    if ((actor.role !== 'owner' && actor.role !== 'admin') || !can(actor.role, 'players.ban'))
        throw new AccountToolsError('forbidden', 'التوثيق للمالك أو المدير فقط.', 403);
    return { id: actor.id, name: actor.name.trim(), role: actor.role };
}
function ownerActor(actor) {
    const by = adminActor(actor);
    if (by.role !== 'owner')
        throw new AccountToolsError('forbidden', 'منح وإلغاء نوع التوثيق المباشر للمالك فقط.', 403);
    return { ...by, role: 'owner' };
}
function refText(ref) {
    if (typeof ref !== 'string' || !REF.test(ref))
        throw new AccountToolsError('bad_ref', 'مفتاح العملية مطلوب: من 8 إلى 128 حرفًا.');
    return ref;
}
function validAction(x, decision) {
    if (!isObj(x) || !only(x, ['reason', 'at', 'actorId', 'actor', 'role', 'ref', ...(decision ? ['status'] : [])]))
        return false;
    try {
        return reasonText(x.reason) === x.reason && timestamp(x.at) && refText(x.ref) === x.ref &&
            !!adminActor({ id: x.actorId, name: x.actor, role: x.role }) &&
            (!decision || x.status === 'accepted' || x.status === 'rejected');
    }
    catch {
        return false;
    }
}
function validGrant(x) {
    if (!isObj(x) || !only(x, ['playerId', 'kind', 'reason', 'at', 'actorId', 'actor', 'role', 'ref', 'requestId', 'revokeRef']) ||
        !safeId(x.playerId) || !validKind(x.kind) || !timestamp(x.at))
        return false;
    try {
        const by = ownerActor({ id: x.actorId, name: x.actor, role: x.role });
        return by.name === x.actor && grantReasonText(x.reason) === x.reason && refText(x.ref) === x.ref &&
            (x.requestId === undefined && x.revokeRef === undefined ||
                x.kind === null && safeId(x.requestId) && refText(x.revokeRef) === x.revokeRef);
    }
    catch {
        return false;
    }
}
function sameGrant(a, b) {
    return a.playerId === b.playerId && a.kind === b.kind && a.reason === b.reason && a.at === b.at &&
        a.actorId === b.actorId && a.actor === b.actor && a.role === b.role && a.ref === b.ref &&
        a.requestId === b.requestId && a.revokeRef === b.revokeRef;
}
/** الغياب مسموح للحقول الإضافية؛ وجود حقل غير صالح لا يُصحّح صامتًا ولا يُكتب فوقه. */
export function validAccountTools(d) {
    if (!only(d, ['v', 'settings', 'requests', 'audit', 'seq', 'directGrants', 'grantHistory']) || (d.v !== undefined && d.v !== 1) ||
        (d.seq !== undefined && !timestamp(d.seq)))
        return false;
    if (d.settings !== undefined && (!isObj(d.settings) || !Object.entries(d.settings).every(([id, s]) => safeId(id) && isObj(s) && only(s, KEYS) && Object.values(s).every(v => typeof v === 'boolean'))))
        return false;
    if (d.requests !== undefined && !Array.isArray(d.requests))
        return false;
    const requests = (d.requests ?? []);
    const ids = new Set(), refs = new Set();
    const latest = new Map();
    try {
        for (const r of requests) {
            if (!isObj(r) || !only(r, ['id', 'playerId', 'reason', 'at', 'status', 'decision', 'revoke']) ||
                !safeId(r.id) || ids.has(r.id) || !safeId(r.playerId) || !timestamp(r.at) ||
                reasonText(r.reason) !== r.reason || !STATUSES.includes(r.status))
                return false;
            ids.add(r.id);
            const previous = latest.get(r.playerId);
            if (previous && (previous.status === 'pending' || previous.status === 'accepted' || r.at < previous.at))
                return false;
            latest.set(r.playerId, r);
            if (r.status === 'pending') {
                if (r.decision !== undefined || r.revoke !== undefined)
                    return false;
            }
            else {
                if (!validAction(r.decision, true) || r.decision.at < r.at ||
                    r.decision.status !== (r.status === 'rejected' ? 'rejected' : 'accepted'))
                    return false;
                if (r.status === 'revoked') {
                    if (!validAction(r.revoke, false) || r.revoke.at < r.decision.at)
                        return false;
                }
                else if (r.revoke !== undefined)
                    return false;
            }
            for (const a of [r.decision, r.revoke])
                if (a) {
                    if (refs.has(a.ref))
                        return false;
                    refs.add(a.ref);
                }
        }
    }
    catch {
        return false;
    }
    if (d.grantHistory !== undefined && !Array.isArray(d.grantHistory) ||
        d.directGrants !== undefined && !isObj(d.directGrants))
        return false;
    const grants = (d.grantHistory ?? []);
    const grantRefs = new Map(), latestGrants = new Map();
    const linkedRevokes = new Set();
    for (const g of grants) {
        if (!validGrant(g) || refs.has(g.ref))
            return false;
        const previous = latestGrants.get(g.playerId);
        if (previous && g.at < previous.at)
            return false;
        if (g.requestId !== undefined) {
            const r = requests.find(r => r.id === g.requestId), x = r?.revoke;
            if (!r || r.playerId !== g.playerId || !x || linkedRevokes.has(x.ref) ||
                x.ref !== g.revokeRef || x.at !== g.at || x.reason !== g.reason ||
                x.actorId !== g.actorId || x.actor !== g.actor || x.role !== g.role)
                return false;
            linkedRevokes.add(x.ref);
        }
        refs.add(g.ref);
        grantRefs.set(g.ref, g);
        latestGrants.set(g.playerId, g);
    }
    const directGrants = (d.directGrants ?? {});
    if (Object.keys(directGrants).length !== latestGrants.size ||
        !Object.entries(directGrants).every(([id, g]) => safeId(id) && validGrant(g) &&
            latestGrants.has(id) && sameGrant(g, latestGrants.get(id))))
        return false;
    if (d.audit !== undefined && !Array.isArray(d.audit))
        return false;
    const auditedGrants = new Set(), auditedRevokes = new Set();
    let lastSeq = 0;
    for (const a of (d.audit ?? [])) {
        if (!isObj(a) || !only(a, ['id', 'ts', 'actorId', 'actor', 'role', 'action', 'target', 'requestId', 'detail', 'ref', 'kind']) ||
            !timestamp(a.id) || a.id <= lastSeq || !timestamp(a.ts) || !safeId(a.actorId) ||
            typeof a.actor !== 'string' || a.actor.length > 120 || controls.test(a.actor))
            return false;
        lastSeq = a.id;
        if (a.action === 'verification.grant' || a.action === 'verification.direct-revoke') {
            const g = a.ref === undefined ? undefined : grantRefs.get(a.ref);
            if (!g || auditedGrants.has(g.ref) || a.requestId !== undefined || a.kind !== g.kind ||
                a.action !== (g.kind === null ? 'verification.direct-revoke' : 'verification.grant') ||
                a.target !== g.playerId || a.actorId !== g.actorId || a.actor !== g.actor || a.role !== g.role ||
                a.detail !== g.reason || a.ts !== g.at)
                return false;
            auditedGrants.add(g.ref);
            continue;
        }
        // لا نرخي ربط تدقيق الطلبات القديمة حتى مع requestId الاختياري لعمليات المنح.
        if (a.kind !== undefined)
            return false;
        const r = requests.find(x => x.id === a.requestId);
        if (!r || r.playerId !== a.target)
            return false;
        if (a.action === 'verification.request') {
            if (a.role !== 'player' || a.actorId !== r.playerId || a.detail !== r.reason || a.ts !== r.at || a.ref !== undefined)
                return false;
        }
        else {
            const x = a.action === 'verification.revoke' ? r.revoke : r.decision;
            if (!x || a.action !== (a.action === 'verification.revoke' ? 'verification.revoke' : r.decision?.status === 'accepted' ? 'verification.accept' : 'verification.reject') ||
                a.actorId !== x.actorId || a.actor !== x.actor || a.role !== x.role || a.detail !== x.reason || a.ref !== x.ref || a.ts !== x.at)
                return false;
        }
        if (a.action === 'verification.revoke' && linkedRevokes.has(a.ref)) {
            if (auditedRevokes.has(a.ref))
                return false;
            auditedRevokes.add(a.ref);
        }
    }
    return auditedGrants.size === grants.length && auditedRevokes.size === linkedRevokes.size &&
        (d.seq === undefined || d.seq >= lastSeq);
}
const blank = () => ({ v: 1, settings: {}, requests: [], audit: [], seq: 0, directGrants: {}, grantHistory: [] });
export class AccountTools {
    now;
    d = blank();
    disk;
    persistent;
    constructor(file = '', now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        this.persistent = !!file;
        if (file) {
            const loaded = loadJsonFile(file, validAccountTools);
            if (loaded) {
                const x = loaded;
                this.d = { ...blank(), ...x, v: 1 };
                this.d.seq = this.d.audit.reduce((max, a) => Math.max(max, a.id), x.seq ?? 0);
            }
        }
        this.disk = new Persister('account-tools', file, () => this.d, now, mon, validAccountTools);
    }
    time(min = 0) {
        const t = this.now();
        if (!timestamp(t))
            throw new AccountToolsError('bad_clock', 'وقت الخادم غير صالح.', 503);
        return Math.max(t, min);
    }
    commit(fn) {
        const snap = structuredClone(this.d);
        try {
            const out = fn();
            this.disk.mustSave();
            return out;
        }
        catch (e) {
            this.d = snap;
            throw e;
        }
    }
    latest(id) {
        for (let i = this.d.requests.length - 1; i >= 0; i--)
            if (this.d.requests[i].playerId === id)
                return this.d.requests[i];
        return undefined;
    }
    directGrant(id) {
        return own(this.d.directGrants, id) ? this.d.directGrants[id] : undefined;
    }
    pushAudit(a) { this.d.audit.push({ id: ++this.d.seq, ...a }); }
    output(r, dup) {
        return { ok: true, dup, request: structuredClone(r), verified: this.verified(r.playerId), kind: this.verificationKind(r.playerId) };
    }
    grantOutput(g, dup) {
        return { ok: true, dup, grant: structuredClone(g), ...this.verification(g.playerId) };
    }
    /** R58f: هل المستخدم اختار بنفسه قيمة لهذا الإعداد؟ (مو القيمة الافتراضية) */
    explicitSetting(id, key) {
        const s = own(this.d.settings, id) ? this.d.settings[id] : undefined;
        return s && Object.hasOwn(s, key) ? s[key] : undefined;
    }
    settings(id) {
        playerId(id);
        return { ...ACCOUNT_SETTINGS_DEFAULTS, ...(own(this.d.settings, id) ? this.d.settings[id] : {}) };
    }
    updateSettings(id, raw) {
        playerId(id);
        const patch = settingsPatch(raw), current = this.settings(id), next = { ...current, ...patch };
        if (KEYS.every(k => current[k] === next[k]))
            return next;
        // R55: نخزن اختيارات اللاعب الصريحة فقط، عشان تغيير الافتراضي مستقبلًا ما ينحبس بقيم ما اختارها
        const stored = { ...(own(this.d.settings, id) ? this.d.settings[id] : {}), ...patch };
        return this.commit(() => { this.d.settings[id] = stored; return { ...next }; });
    }
    requestVerification(id, reason) {
        playerId(id);
        const text = reasonText(reason), prev = this.latest(id);
        if (this.directGrant(id)?.kind) {
            if ((prev?.status === 'pending' || prev?.status === 'accepted') && prev.reason === text)
                return { ok: true, dup: true, ...this.verification(id) };
            throw new AccountToolsError('already_verified', 'حسابك موثّق بالفعل.', 409);
        }
        if (prev?.status === 'pending' || prev?.status === 'accepted') {
            if (prev.reason === text)
                return { ok: true, dup: true, ...this.verification(id) };
            throw new AccountToolsError(prev.status === 'pending' ? 'pending_request' : 'already_verified', prev.status === 'pending' ? 'عندك طلب توثيق قيد المراجعة.' : 'حسابك موثّق بالفعل.', 409);
        }
        return this.commit(() => {
            const at = this.time(prev?.revoke?.at ?? prev?.decision?.at ?? 0);
            const r = { id: 'vq_' + randomUUID(), playerId: id, reason: text, at, status: 'pending' };
            this.d.requests.push(r);
            this.pushAudit({ ts: at, actorId: id, actor: '', role: 'player', action: 'verification.request', target: id, requestId: r.id, detail: text });
            return { ok: true, dup: false, ...this.verification(id) };
        });
    }
    /** إسقاط اللاعب فقط: لا معرّفات لاعبين آخرين ولا أسماء إدارة ولا مفاتيح عمليات. */
    verification(id) {
        playerId(id);
        const r = this.latest(id), kind = this.verificationKind(id);
        return { verified: kind !== null, kind, status: kind !== null ? 'accepted' : r?.status ?? (this.directGrant(id) ? 'revoked' : 'none'), request: r ? {
                id: r.id, reason: r.reason, at: r.at, status: r.status,
                ...(r.decision ? { decisionReason: r.decision.reason, decidedAt: r.decision.at } : {}),
                ...(r.revoke ? { revocationReason: r.revoke.reason, revokedAt: r.revoke.at } : {}),
            } : null };
    }
    /** الإدارة فقط عند الربط: اللائحة وتدقيق عناصر الصفحة من اللقطة نفسها وبنسخ غير قابلة لتعديل المخزن. */
    verificationList(status, offset = 0, limit = 25) {
        if ((status !== undefined && !STATUSES.includes(status)) || !Number.isSafeInteger(offset) || offset < 0 ||
            !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
            throw new AccountToolsError('bad_page', 'فلتر أو ترقيم صفحات غير صالح (الحد من 1 إلى 100).');
        const rows = [...this.d.requests].reverse().filter(r => status === undefined || r.status === status);
        const list = rows.slice(offset, offset + limit), ids = new Set(list.map(r => r.id));
        return structuredClone({ total: rows.length, offset, limit, list, audit: this.d.audit.filter(a => a.requestId !== undefined && ids.has(a.requestId)) });
    }
    seen(ref) {
        for (const r of this.d.requests) {
            if (r.decision?.ref === ref)
                return { r, action: r.decision, kind: 'decision' };
            if (r.revoke?.ref === ref)
                return { r, action: r.revoke, kind: 'revoke' };
        }
        for (const g of this.d.grantHistory)
            if (g.ref === ref)
                return { g, action: g, kind: 'grant' };
        return undefined;
    }
    sameAction(a, reason, actor) {
        return a.reason === reason && a.actorId === actor.id && a.actor === actor.name && a.role === actor.role;
    }
    /** علامة فقط؛ الصلاحيات ودور الطاقم لا تُقرأ ولا تُمنح في هذا المخزن. */
    grantVerification(id, kind, reason, actor, ref) {
        playerId(id);
        const by = ownerActor(actor), text = grantReasonText(reason), key = refText(ref);
        if (!validKind(kind))
            throw new AccountToolsError('bad_kind', 'نوع التوثيق: standard أو administration أو null.');
        const seen = this.seen(key);
        if (seen) {
            if (seen.kind !== 'grant' || seen.g.playerId !== id || seen.g.kind !== kind || !this.sameAction(seen.action, text, by))
                throw new AccountToolsError('ref_conflict', 'مفتاح العملية مستخدم لمحتوى مختلف.', 409);
            return this.grantOutput(seen.g, true);
        }
        return this.commit(() => {
            const r = this.latest(id), previous = this.directGrant(id);
            const at = this.time(Math.max(previous?.at ?? 0, r?.revoke?.at ?? r?.decision?.at ?? r?.at ?? 0));
            const g = { playerId: id, kind, reason: text, at, actorId: by.id, actor: by.name, role: by.role, ref: key };
            // null يزيل التوثيق كله وقت العملية؛ قبول طلب جديد لاحقًا يبقى مسارًا حقيقيًا صالحًا.
            if (kind === null && r?.status === 'accepted') {
                let revokeRef;
                do {
                    revokeRef = 'vr_' + randomUUID();
                } while (revokeRef === key || this.seen(revokeRef));
                this.revokeRequest(r, text, by, revokeRef, at);
                g.requestId = r.id;
                g.revokeRef = revokeRef;
            }
            this.d.directGrants[id] = g;
            this.d.grantHistory.push(g);
            this.pushAudit({ ts: at, actorId: by.id, actor: by.name, role: by.role,
                action: kind === null ? 'verification.direct-revoke' : 'verification.grant', target: id, detail: text, ref: key, kind });
            return this.grantOutput(g, false);
        });
    }
    decideVerification(requestId, status, reason, actor, ref) {
        playerId(requestId);
        const by = adminActor(actor), text = reasonText(reason), key = refText(ref);
        if (status !== 'accepted' && status !== 'rejected')
            throw new AccountToolsError('bad_status', 'القرار: accepted أو rejected.');
        const seen = this.seen(key);
        if (seen) {
            if (seen.kind !== 'decision' || seen.r.id !== requestId || seen.r.decision.status !== status || !this.sameAction(seen.action, text, by))
                throw new AccountToolsError('ref_conflict', 'مفتاح العملية مستخدم لمحتوى مختلف.', 409);
            return this.output(seen.r, true);
        }
        const r = this.d.requests.find(r => r.id === requestId);
        if (!r)
            throw new AccountToolsError('not_found', 'طلب غير موجود.', 404);
        if (r.status !== 'pending')
            throw new AccountToolsError('already_decided', 'سبق البت في الطلب.', 409);
        return this.commit(() => {
            const at = this.time(r.at);
            r.status = status;
            r.decision = { status, reason: text, at, actorId: by.id, actor: by.name, role: by.role, ref: key };
            this.pushAudit({ ts: at, actorId: by.id, actor: by.name, role: by.role,
                action: status === 'accepted' ? 'verification.accept' : 'verification.reject', target: r.playerId, requestId: r.id, detail: text, ref: key });
            return this.output(r, false);
        });
    }
    revokeRequest(r, text, by, key, at) {
        r.status = 'revoked';
        r.revoke = { reason: text, at, actorId: by.id, actor: by.name, role: by.role, ref: key };
        this.pushAudit({ ts: at, actorId: by.id, actor: by.name, role: by.role, action: 'verification.revoke',
            target: r.playerId, requestId: r.id, detail: text, ref: key });
    }
    revokeVerification(id, reason, actor, ref) {
        playerId(id);
        const by = adminActor(actor), text = reasonText(reason), key = refText(ref), seen = this.seen(key);
        if (seen) {
            if (seen.kind !== 'revoke' || seen.r.playerId !== id || !this.sameAction(seen.action, text, by))
                throw new AccountToolsError('ref_conflict', 'مفتاح العملية مستخدم لمحتوى مختلف.', 409);
            return this.output(seen.r, true);
        }
        const r = this.latest(id);
        if (!r || r.status !== 'accepted')
            throw new AccountToolsError('not_verified', 'الحساب غير موثّق حاليًا.', 409);
        return this.commit(() => {
            const at = this.time(r.decision.at);
            this.revokeRequest(r, text, by, key, at);
            return this.output(r, false);
        });
    }
    verificationKind(id) {
        playerId(id);
        // null ألغى الطلب المقبول ذريًا؛ الرجوع هنا يقبل فقط قبولًا حقيقيًا لاحقًا.
        return this.directGrant(id)?.kind ?? (this.latest(id)?.status === 'accepted' ? 'standard' : null);
    }
    verified(id) { return this.verificationKind(id) !== null; }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
