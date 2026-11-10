import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadJsonFile, Persister, StorageMonitor, StorageError, isObj } from './datafile.js';
import { sniff } from './avatars.js';
import { KeyedLimiter } from './ratelimit.js';
/**
 * المجتمع: منشورات (نص + صورة اختيارية)، إعجابات، تعليقات وردود، متابعة، إشعارات داخل الموقع، وبلاغات للإدارة.
 * - الهوية من جلسة الحساب القائمة فقط (ما فيه نظام حسابات موازي). معرّف الحساب الداخلي ما يطلع للعميل أبداً:
 *   نعرض «معرّف عام» = HMAC(سر الكوكي، المعرّف) ثابت ولا ينعكس.
 * - التخزين: ملف JSON واحد (نفس نمط المحفظة: كتابة ذرية + .bak، التالف يوقف التشغيل). كل تغيير يُحفظ قبل ما يُعتبر ناجحاً؛
 *   لو فشل الحفظ يتراجع بالكامل ويرجع StorageError (503 للعميل).
 * - الصور: الخادم يتحقق من النوع الحقيقي بالبايتات (JPEG/PNG/WebP فقط، لا SVG) والحجم، ويخزّنها باسم عشوائي (ما نستعمل اسم العميل).
 *   الصيغة قابلة للتوسع للفيديو لاحقاً (حقل type) لكن الفيديو غير مطبّق.
 * - لا عملات مقابل الإعجابات أو التعليقات.
 */
export const POST_MAX = 1000, COMMENT_MAX = 400, REPORT_MAX = 300, MEDIA_MAX = 700 * 1024, PAGE = 15, NOTIF_KEEP = 200;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MEDIA_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
export const REPORT_REASONS = ['spam', 'abuse', 'inappropriate', 'privacy', 'other'];
/** الحقول الأساسية إلزامية؛ الحظر والكتم وحقول القرار الأقدم تظل اختيارية. ما نصلّح بيانات تالفة بصمت. */
export function validCommunity(d) {
    const num = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
    const id = (v) => num(v) && v > 0;
    const str = (v) => typeof v === 'string';
    const account = (v) => str(v) && v.length > 0;
    const ref = (v) => v === null || id(v);
    const media = (v) => v === null || (str(v) && MEDIA_RE.test(v));
    const accounts = (v) => Array.isArray(v) && v.every(account);
    const map = (v) => isObj(v) && Object.entries(v).every(([k, l]) => account(k) && accounts(l));
    const optionalMap = (v) => v === undefined || map(v);
    const rows = (v, check) => Array.isArray(v) && v.every((x) => isObj(x) && check(x));
    if (!isObj(d) || d.v !== 1 || !num(d.seq) || d.seq >= Number.MAX_SAFE_INTEGER)
        return false;
    if (!rows(d.posts, (p) => id(p.id) && account(p.by) && str(p.text) && media(p.media) && num(p.at) && (p.edited === null || num(p.edited)) && accounts(p.likes) && (p.removed === undefined || typeof p.removed === 'boolean')))
        return false;
    if (!rows(d.comments, (c) => id(c.id) && id(c.post) && account(c.by) && str(c.text) && num(c.at) && ref(c.parent)))
        return false;
    if (!map(d.follows) || !optionalMap(d.blocks) || !optionalMap(d.mutes))
        return false;
    if (!rows(d.notifs, (n) => id(n.id) && account(n.to) && account(n.from) && ['like', 'comment', 'reply', 'follow'].includes(n.kind) && ref(n.post) && ref(n.comment) && num(n.at) && typeof n.read === 'boolean' && str(n.key)))
        return false;
    if (!rows(d.reports, (r) => id(r.id) && ['post', 'comment'].includes(r.kind) && id(r.target) && account(r.by) && REPORT_REASONS.includes(r.reason) && str(r.note) && num(r.at) && ['open', 'removed', 'dismissed'].includes(r.status) && isObj(r.snap) && account(r.snap.author) && str(r.snap.text) && media(r.snap.media) && (r.decidedBy === undefined || str(r.decidedBy)) && (r.decidedAt === undefined || num(r.decidedAt)) && (r.decision === undefined || str(r.decision))))
        return false;
    if (!isObj(d.media) || !Object.entries(d.media).every(([name, m]) => MEDIA_RE.test(name) && isObj(m) && account(m.by) && Object.hasOwn(EXT, m.type) && num(m.at) && ref(m.post) && id(m.size)))
        return false;
    if (!isObj(d.recent) || !Object.entries(d.recent).every(([k, l]) => account(k) && rows(l, (x) => account(x.h) && num(x.at))))
        return false;
    const data = d;
    const all = [...data.posts, ...data.comments, ...data.notifs, ...data.reports];
    if (new Set(all.map((x) => x.id)).size !== all.length || all.some((x) => x.id > data.seq))
        return false;
    const posts = new Map(data.posts.map((p) => [p.id, p]));
    const comments = new Map(data.comments.map((c) => [c.id, c]));
    if (data.comments.some((c) => !posts.has(c.post) || (c.parent !== null && (!comments.has(c.parent) || comments.get(c.parent).post !== c.post || comments.get(c.parent).parent !== null))))
        return false;
    if (data.posts.some((p) => p.media !== null && (!data.media[p.media] || data.media[p.media].post !== p.id || data.media[p.media].by !== p.by)))
        return false;
    if (Object.entries(data.media).some(([name, m]) => m.post !== null && (!posts.has(m.post) || posts.get(m.post).media !== name)))
        return false;
    // البلاغات تحتفظ بلقطة حتى بعد حذف المحتوى؛ ما نفرض وجود هدفها الحالي.
    return data.notifs.every((n) => n.kind === 'follow' ? n.post === null && n.comment === null : n.post !== null && posts.has(n.post) && (n.kind === 'like' ? n.comment === null : n.comment !== null && comments.get(n.comment)?.post === n.post));
}
/** تنظيف نص المستخدم: نشيل محارف التحكم واتجاه النص المخفية، ونحافظ على الأسطر (بحد أقصى سطرين فاضيين) */
export function cleanText(v, max, lines = true) {
    let s = typeof v === 'string' ? v : '';
    s = s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '');
    s = lines ? s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
    return s.trim().slice(0, max);
}
/** [سعة، إعادة تعبئة بالثانية] لكل نوع */
export const DEFAULT_LIMITS = { post: [3, 1 / 200], comment: [8, 8 / 60], like: [40, 1], follow: [20, 20 / 60], report: [10, 10 / 3600], upload: [5, 5 / 600], read: [120, 4] };
export class CommunityError extends Error {
    status;
    code;
    constructor(status, msg, code = '') {
        super(msg);
        this.status = status;
        this.code = code;
    }
}
export class Community {
    file;
    mediaDir;
    dep;
    now;
    d = { v: 1, seq: 0, posts: [], comments: [], follows: {}, notifs: [], reports: [], media: {}, recent: {} };
    disk;
    mem = new Map();
    pubCache = new Map();
    byPub = new Map();
    lim;
    /** لاختبار فشل التخزين فقط */
    failMedia = false;
    constructor(file, mediaDir, dep, now = Date.now, mon = new StorageMonitor(), limits = {}) {
        this.file = file;
        this.mediaDir = mediaDir;
        this.dep = dep;
        this.now = now;
        if (file) {
            const loaded = loadJsonFile(file, validCommunity);
            if (loaded)
                this.d = { ...this.d, ...loaded };
        }
        this.disk = new Persister('community', file, () => this.d, now, mon);
        const L = { ...DEFAULT_LIMITS, ...limits };
        this.lim = Object.fromEntries(Object.entries(L).map(([k, [c, r]]) => [k, new KeyedLimiter(c, r, now)]));
    }
    get persistent() { return !!this.file; }
    retry() { this.disk.retry(); }
    /* ---------- هوية عامة ---------- */
    pub(id) {
        let p = this.pubCache.get(id);
        if (!p) {
            p = createHmac('sha256', this.dep.secret).update('pub:' + id).digest('base64url').slice(0, 16);
            this.pubCache.set(id, p);
            this.byPub.set(p, id);
        }
        return p;
    }
    idOfPub(pub) {
        if (typeof pub !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(pub))
            return null;
        if (!this.byPub.has(pub))
            for (const id of this.dep.allIds())
                this.pub(id);
        const id = this.byPub.get(pub);
        return id && this.dep.hasAccount(id) ? id : null;
    }
    /** جسور قراءة فقط للوظائف الخاصة؛ الهوية العامة والحظر من المصدر الحالي نفسه. */
    resolvePublicId(pub) { return this.idOfPub(pub); }
    pairBlocked(a, b) { return this.blocked(a, b); }
    isMuted(actor, target) { return !!this.d.mutes?.[actor]?.includes(target); }
    who(id) { return { pub: this.pub(id), name: this.dep.nameOf(id) || 'لاعب', av: this.dep.avOf(id) }; }
    /* ---------- أدوات ---------- */
    rate(kind, id) { if (!this.lim[kind].allow(id))
        throw new CommunityError(429, 'بشويش 🙂 طلبات كثيرة ورا بعض، جرّب بعد شوي.', 'rate'); }
    /** تغيير ذري: لو فشل الحفظ نرجّع الحالة كما كانت ونرمي StorageError */
    tx(fn) {
        const backup = JSON.stringify(this.d);
        let out;
        try {
            out = fn();
        }
        catch (e) {
            this.d = JSON.parse(backup);
            throw e;
        }
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = JSON.parse(backup);
            throw e;
        }
        return out;
    }
    post(id) {
        const n = Number(id);
        const p = Number.isInteger(n) ? this.d.posts.find((x) => x.id === n && !x.removed) : undefined;
        if (!p || this.dep.isBanned(p.by))
            throw new CommunityError(404, 'المنشور غير موجود أو انحذف.');
        return p;
    }
    dupCheck(by, text, kind) {
        const h = createHmac('sha256', 'dup').update(kind + '\n' + text).digest('base64url').slice(0, 16);
        const t = this.now();
        const list = (this.d.recent[by] ?? []).filter((x) => t - x.at < 10 * 60_000);
        if (list.some((x) => x.h === h))
            throw new CommunityError(409, 'كتبت نفس الكلام قبل شوي.', 'dup');
        list.push({ h, at: t });
        this.d.recent[by] = list.slice(-20);
    }
    nextId() { return ++this.d.seq; }
    /* ---------- الحظر والكتم ----------
     * الكتم: يخفي منشورات وتعليقات الشخص عنك ويوقف إشعاراته لك (هو ما يدري).
     * الحظر: كتم + منع كل تفاعل بالاتجاهين (إعجاب، تعليق، رد، متابعة) + يشيل المتابعة بينكم + ما يقدر يفتح ملفك ولا منشوراتك.
     * كله بالخادم على كل مسار قراءة/كتابة، فما ينتجاوز من الواجهة. */
    blocked(a, b) { return !!(this.d.blocks?.[a]?.includes(b) || this.d.blocks?.[b]?.includes(a)); }
    hidden(me, author) { return !!me && me !== author && (this.blocked(me, author) || !!this.d.mutes?.[me]?.includes(author)); }
    /** R66: منشورات صاحبها مخفية عن الكل غيره */
    priv(me, author) { return me !== author && this.dep.postsHidden?.(author) === true; }
    guard(me, other) { if (me !== other && this.blocked(me, other))
        throw new CommunityError(403, 'ما تقدر تتفاعل مع هذا الحساب.', 'blocked'); }
    notify(to, kind, from, post, comment, key) {
        if (to === from || this.hidden(to, from))
            return;
        if (key && this.d.notifs.some((n) => n.key === key && n.to === to))
            return; // نفس الحدث ما يتكرر (إعجاب ثم إلغاء ثم إعجاب)
        this.d.notifs.push({ id: this.nextId(), to, kind, from, post, comment, at: this.now(), read: false, key });
        const mine = this.d.notifs.filter((n) => n.to === to);
        if (mine.length > NOTIF_KEEP) {
            const drop = new Set(mine.slice(0, mine.length - NOTIF_KEEP).map((n) => n.id));
            this.d.notifs = this.d.notifs.filter((n) => !drop.has(n.id));
        }
    }
    afterNotify(ids) { for (const id of new Set(ids))
        this.dep.push(id, { t: 'notif', unread: this.unread(id) }); }
    /* ---------- عرض ---------- */
    postView(p, me) {
        const comments = this.d.comments.filter((c) => c.post === p.id).length;
        return { id: p.id, author: this.who(p.by), text: p.text, media: p.media ? '/api/community/media/' + p.media : null, at: p.at, edited: p.edited, likes: p.likes.length, liked: !!me && p.likes.includes(me), comments, mine: me === p.by };
    }
    visible(p) { return !p.removed && !this.dep.isBanned(p.by); }
    feed(me, opts = {}) {
        const before = Number(opts.before) > 0 ? Number(opts.before) : Infinity;
        const lim = Math.max(1, Math.min(PAGE, Number(opts.limit) || PAGE));
        let pool = this.d.posts.filter((p) => p.id < before && this.visible(p) && !this.hidden(me, p.by) && !this.priv(me, p.by));
        if (opts.scope === 'following') {
            if (!me)
                return { posts: [], more: false };
            const f = new Set(this.d.follows[me] ?? []);
            pool = pool.filter((p) => f.has(p.by) || p.by === me);
        }
        const page = pool.slice(-lim - 1).reverse();
        const more = page.length > lim;
        return { posts: page.slice(0, lim).map((p) => this.postView(p, me)), more };
    }
    postDetail(me, id) {
        const p = this.post(id);
        if (me && this.blocked(me, p.by))
            throw new CommunityError(404, 'المنشور غير موجود أو انحذف.');
        if (this.priv(me, p.by))
            throw new CommunityError(404, 'صاحب المنشور مخفي منشوراته.', 'posts_hidden');
        const all = this.d.comments.filter((c) => c.post === p.id && !this.dep.isBanned(c.by) && !this.hidden(me, c.by));
        const cv = (c) => ({ id: c.id, author: this.who(c.by), text: c.text, at: c.at, parent: c.parent, mine: me === c.by, canDelete: me === c.by || me === p.by });
        return { post: this.postView(p, me), comments: all.slice(-200).map(cv) };
    }
    /** قراءة فقط من علاقات المتابعة نفسها، دون تصفية إضافية أو إنشاء بيانات. */
    followCounts(id) {
        if (typeof id !== 'string' || !id)
            return { followersCount: 0, followingCount: 0 };
        const following = this.d.follows[id];
        return { followersCount: Object.entries(this.d.follows).filter(([, l]) => l.includes(id)).length, followingCount: Array.isArray(following) ? following.length : 0 };
    }
    profile(me, pub, before) {
        const id = this.idOfPub(pub);
        if (!id || this.dep.isBanned(id) || this.dep.hidden?.(id))
            throw new CommunityError(404, 'الحساب غير موجود.');
        if (me && this.d.blocks?.[id]?.includes(me))
            throw new CommunityError(404, 'الحساب غير موجود.'); // حظرك: كأنه غير موجود
        const iBlocked = !!me && !!this.d.blocks?.[me]?.includes(id);
        const iMuted = !!me && !!this.d.mutes?.[me]?.includes(id);
        const counts = this.followCounts(id);
        const { followersCount: followers, followingCount: following } = counts;
        const b = Number(before) > 0 ? Number(before) : Infinity;
        const allPosts = this.d.posts.filter((p) => p.by === id && this.visible(p));
        const posts = allPosts.filter((p) => p.id < b);
        const page = posts.slice(-PAGE - 1).reverse();
        if (iBlocked)
            return { user: { ...this.who(id), stats: null, ...counts, followers, following, followed: false, me: false, posts: 0, blocked: true, muted: iMuted }, posts: [], more: false };
        if (this.priv(me, id))
            return { user: { ...this.who(id), anim: this.dep.animTier?.(id) ?? 0, phone: this.dep.phoneOk?.(id) ?? false, adminId: this.dep.adminIdOf?.(id) ?? null, stats: this.dep.stats(id), ...counts, followers, following, followed: !!me && (this.d.follows[me] ?? []).includes(id), me: false, posts: 0, blocked: false, muted: iMuted, postsHidden: true, bg: this.dep.profileBg?.(id) ?? null, official: this.dep.official?.(id) === true }, posts: [], more: false };
        return { user: { ...this.who(id), anim: this.dep.animTier?.(id) ?? 0, phone: this.dep.phoneOk?.(id) ?? false, adminId: this.dep.adminIdOf?.(id) ?? null, stats: this.dep.stats(id), ...counts, followers, following, followed: !!me && (this.d.follows[me] ?? []).includes(id), me: me === id, posts: allPosts.length, blocked: false, muted: iMuted, bg: this.dep.profileBg?.(id) ?? null, official: this.dep.official?.(id) === true }, posts: page.slice(0, PAGE).map((p) => this.postView(p, me)), more: page.length > PAGE };
    }
    followList(pub, which, me = null) {
        const id = this.idOfPub(pub);
        if (!id || this.dep.isBanned(id) || this.dep.hidden?.(id))
            throw new CommunityError(404, 'الحساب غير موجود.');
        if (me && this.d.blocks?.[id]?.includes(me))
            throw new CommunityError(404, 'الحساب غير موجود.');
        if (me && this.blocked(me, id))
            return { list: [] };
        const ids = which === 'following' ? (this.d.follows[id] ?? []) : Object.entries(this.d.follows).filter(([, l]) => l.includes(id)).map(([k]) => k);
        return { list: ids.filter((x) => !this.dep.isBanned(x) && this.dep.hasAccount(x)).slice(-200).reverse().map((x) => this.who(x)) };
    }
    visibleNotif(n, me) { return n.to === me && !this.dep.isBanned(n.from) && !this.hidden(me, n.from); }
    unread(me) { return this.d.notifs.filter((n) => this.visibleNotif(n, me) && !n.read).length; }
    notifs(me) {
        const list = this.d.notifs.filter((n) => this.visibleNotif(n, me)).slice(-60).reverse();
        return { unread: this.unread(me), list: list.map((n) => ({ id: n.id, kind: n.kind, from: this.who(n.from), post: n.post, comment: n.comment, at: n.at, read: n.read })) };
    }
    /* ---------- كتابة ---------- */
    createPost(me, b) {
        this.rate('post', me);
        const text = cleanText(b.text, POST_MAX);
        const media = typeof b.media === 'string' && b.media ? b.media : null;
        if (media) {
            const m = this.d.media[media];
            if (!MEDIA_RE.test(media) || !m || m.by !== me || m.post !== null)
                throw new CommunityError(400, 'الصورة غير صالحة. ارفعها من جديد.');
        }
        if (!text && !media)
            throw new CommunityError(400, 'اكتب شي أو أضف صورة.');
        {
            const bad = text ? this.dep.moderate?.(text) : null;
            if (bad)
                throw new CommunityError(422, bad);
        }
        return this.tx(() => {
            if (text)
                this.dupCheck(me, text, 'post');
            const p = { id: this.nextId(), by: me, text, media, at: this.now(), edited: null, likes: [] };
            this.d.posts.push(p);
            if (media)
                this.d.media[media].post = p.id;
            return this.postView(p, me);
        });
    }
    editPost(me, id, b) {
        this.rate('comment', me);
        const p = this.post(id);
        if (p.by !== me)
            throw new CommunityError(403, 'تقدر تعدّل منشوراتك بس.');
        const text = cleanText(b.text, POST_MAX);
        if (!text && !p.media)
            throw new CommunityError(400, 'المنشور ما يصير فاضي.');
        {
            const bad = text ? this.dep.moderate?.(text) : null;
            if (bad)
                throw new CommunityError(422, bad);
        }
        return this.tx(() => { p.text = text; p.edited = this.now(); return this.postView(p, me); });
    }
    /** حذف منشور: صاحبه فقط (والإدارة عبر البلاغات). يحذف التعليقات والإعجابات والإشعارات المرتبطة والصورة */
    deletePost(me, id) {
        const p = this.post(id);
        if (p.by !== me)
            throw new CommunityError(403, 'تقدر تحذف منشوراتك بس.');
        this.tx(() => this.purgePost(p));
        this.dropMediaFile(p.media);
        return { ok: true };
    }
    purgePost(p) {
        this.d.posts = this.d.posts.filter((x) => x.id !== p.id);
        this.d.comments = this.d.comments.filter((c) => c.post !== p.id);
        this.d.notifs = this.d.notifs.filter((n) => n.post !== p.id);
        if (p.media)
            delete this.d.media[p.media];
    }
    like(me, id, on) {
        this.rate('like', me);
        const p = this.post(id);
        this.guard(me, p.by);
        const want = on !== false;
        const has = p.likes.includes(me);
        if (want === has)
            return { likes: p.likes.length, liked: has }; // idempotent: تكرار الطلب ما يغيّر العدد
        const r = this.tx(() => {
            if (want) {
                p.likes.push(me);
                this.notify(p.by, 'like', me, p.id, null, `like:${p.id}:${me}`);
            }
            else
                p.likes = p.likes.filter((x) => x !== me);
            return { likes: p.likes.length, liked: want };
        });
        if (want)
            this.afterNotify([p.by]);
        return r;
    }
    comment(me, id, b) {
        this.rate('comment', me);
        const p = this.post(id);
        this.guard(me, p.by);
        const text = cleanText(b.text, COMMENT_MAX);
        if (!text)
            throw new CommunityError(400, 'اكتب تعليقك.');
        {
            const bad = this.dep.moderate?.(text);
            if (bad)
                throw new CommunityError(422, bad);
        }
        let parent;
        if (b.parent !== undefined && b.parent !== null) {
            parent = this.d.comments.find((c) => c.id === Number(b.parent) && c.post === p.id);
            if (!parent)
                throw new CommunityError(404, 'التعليق اللي ترد عليه انحذف.');
            if (parent.parent !== null)
                parent = this.d.comments.find((c) => c.id === parent.parent) ?? parent; // الردود بمستوى واحد
            this.guard(me, parent.by);
        }
        const notified = [];
        const c = this.tx(() => {
            this.dupCheck(me, p.id + ':' + text, 'comment');
            const c = { id: this.nextId(), post: p.id, by: me, text, at: this.now(), parent: parent ? parent.id : null };
            this.d.comments.push(c);
            this.notify(p.by, 'comment', me, p.id, c.id, '');
            notified.push(p.by);
            if (parent && parent.by !== p.by) {
                this.notify(parent.by, 'reply', me, p.id, c.id, '');
                notified.push(parent.by);
            }
            return c;
        });
        this.afterNotify(notified.filter((x) => x !== me));
        return { comment: { id: c.id, author: this.who(me), text: c.text, at: c.at, parent: c.parent, mine: true, canDelete: true }, comments: this.d.comments.filter((x) => x.post === p.id).length };
    }
    /** حذف تعليق: كاتبه أو صاحب المنشور. حذف تعليق أصلي يحذف ردوده */
    deleteComment(me, cid) {
        const c = this.d.comments.find((x) => x.id === Number(cid));
        if (!c)
            throw new CommunityError(404, 'التعليق غير موجود.');
        const p = this.post(c.post);
        if (c.by !== me && p.by !== me)
            throw new CommunityError(403, 'ما تقدر تحذف هذا التعليق.');
        this.tx(() => this.purgeComment(c));
        return { ok: true, comments: this.d.comments.filter((x) => x.post === p.id).length };
    }
    purgeComment(c) {
        const ids = new Set([c.id, ...this.d.comments.filter((x) => x.parent === c.id).map((x) => x.id)]);
        this.d.comments = this.d.comments.filter((x) => !ids.has(x.id));
        this.d.notifs = this.d.notifs.filter((n) => n.comment === null || !ids.has(n.comment));
    }
    follow(me, pub, on) {
        this.rate('follow', me);
        const id = this.idOfPub(pub);
        if (!id || this.dep.isBanned(id))
            throw new CommunityError(404, 'الحساب غير موجود.');
        if (id === me)
            throw new CommunityError(400, 'ما تقدر تتابع نفسك.');
        if (on !== false)
            this.guard(me, id);
        const want = on !== false;
        const list = this.d.follows[me] ?? [];
        if (list.includes(id) === want)
            return { followed: want };
        this.tx(() => {
            this.d.follows[me] = want ? [...list, id] : list.filter((x) => x !== id);
            if (want)
                this.notify(id, 'follow', me, null, null, `follow:${me}`);
        });
        if (want)
            this.afterNotify([id]);
        return { followed: want };
    }
    /** حظر/فك حظر أو كتم/فك كتم حساب (بالمعرّف العام). الحظر يشيل المتابعة بالاتجاهين. */
    setRel(me, pub, kind, on) {
        this.rate('follow', me);
        const id = this.idOfPub(pub);
        if (!id)
            throw new CommunityError(404, 'الحساب غير موجود.');
        if (id === me)
            throw new CommunityError(400, kind === 'block' ? 'ما تقدر تحظر نفسك.' : 'ما تقدر تكتم نفسك.');
        const want = on !== false;
        const map = kind === 'block' ? (this.d.blocks ??= {}) : (this.d.mutes ??= {});
        const list = map[me] ?? [];
        if (list.includes(id) === want)
            return { on: want };
        if (want && list.length >= 500)
            throw new CommunityError(409, 'وصلت الحد (500).');
        this.tx(() => {
            map[me] = want ? [...list, id] : list.filter((x) => x !== id);
            if (want && kind === 'block') {
                this.d.follows[me] = (this.d.follows[me] ?? []).filter((x) => x !== id);
                this.d.follows[id] = (this.d.follows[id] ?? []).filter((x) => x !== me);
                this.d.notifs = this.d.notifs.filter((n) => !(n.to === me && n.from === id));
            }
        });
        return { on: want };
    }
    /** قائمتي: المحظورين والمكتومين (أسماء ومعرّفات عامة فقط) */
    relations(me) {
        const map = (l) => (l ?? []).filter((x) => this.dep.hasAccount(x)).map((x) => this.who(x));
        return { blocked: map(this.d.blocks?.[me]), muted: map(this.d.mutes?.[me]) };
    }
    markRead(me, ids) {
        const set = Array.isArray(ids) ? new Set(ids.map(Number)) : null;
        const hit = this.d.notifs.filter((n) => n.to === me && !n.read && (!set || set.has(n.id)));
        if (hit.length)
            this.tx(() => { for (const n of hit)
                n.read = true; });
        return { unread: this.unread(me) };
    }
    report(me, b) {
        this.rate('report', me);
        const kind = b.kind === 'comment' ? 'comment' : b.kind === 'post' ? 'post' : null;
        if (!kind)
            throw new CommunityError(400, 'نوع البلاغ غير صالح.');
        const reason = REPORT_REASONS.includes(String(b.reason)) ? String(b.reason) : null;
        if (!reason)
            throw new CommunityError(400, 'اختر سبب البلاغ.');
        const note = cleanText(b.note, REPORT_MAX, false);
        let snap;
        let target;
        if (kind === 'post') {
            const p = this.post(b.id);
            if (p.by === me)
                throw new CommunityError(400, 'ما تقدر تبلّغ عن منشورك.');
            target = p.id;
            snap = { author: p.by, text: p.text, media: p.media };
        }
        else {
            const c = this.d.comments.find((x) => x.id === Number(b.id));
            if (!c)
                throw new CommunityError(404, 'التعليق غير موجود.');
            this.post(c.post);
            if (c.by === me)
                throw new CommunityError(400, 'ما تقدر تبلّغ عن تعليقك.');
            target = c.id;
            snap = { author: c.by, text: c.text, media: null };
        }
        if (this.d.reports.some((r) => r.by === me && r.kind === kind && r.target === target && r.status === 'open'))
            return { ok: true, dup: true };
        this.tx(() => { this.d.reports.push({ id: this.nextId(), kind, target, by: me, reason, note, at: this.now(), status: 'open', snap }); });
        this.dep.log('community_report', { kind });
        return { ok: true, dup: false };
    }
    /* ---------- الصور ---------- */
    uploadMedia(me, buf, declared) {
        this.rate('upload', me);
        const real = sniff(buf);
        if (!real || real !== declared)
            throw new CommunityError(400, 'الملف مو صورة صالحة (المسموح JPG وPNG وWebP).');
        if (buf.length > MEDIA_MAX)
            throw new CommunityError(413, 'الصورة كبيرة.');
        // صور مرفوعة وما انربطت بمنشور خلال ساعة تنحذف (ونحدّ المعلّق لكل حساب)
        const t = this.now();
        const stale = Object.entries(this.d.media).filter(([, m]) => m.post === null && t - m.at > 3_600_000).map(([k]) => k);
        if (Object.values(this.d.media).filter((m) => m.by === me && m.post === null && t - m.at <= 3_600_000).length >= 4)
            throw new CommunityError(429, 'عندك صور مرفوعة ما نشرتها. انشرها أو انتظر شوي.', 'rate');
        const name = randomBytes(16).toString('hex') + '.' + EXT[real];
        try {
            if (this.failMedia)
                throw new Error('EIO');
            if (this.mediaDir) {
                mkdirSync(this.mediaDir, { recursive: true });
                const f = path.join(this.mediaDir, name);
                writeFileSync(f + '.tmp', buf, { mode: 0o600 });
                renameSync(f + '.tmp', f);
            }
            else
                this.mem.set(name, buf);
        }
        catch (e) {
            this.dep.log('community_media_failed', { code: e.code ?? 'EIO' });
            throw new CommunityError(503, 'تعذّر حفظ الصورة الآن. جرّب بعد شوي.', 'storage');
        }
        try {
            this.tx(() => { for (const k of stale)
                delete this.d.media[k]; this.d.media[name] = { by: me, type: real, at: t, post: null, size: buf.length }; });
        }
        catch (e) {
            this.dropMediaFile(name);
            throw e;
        }
        for (const k of stale)
            this.dropMediaFile(k);
        return { media: name };
    }
    /** الصورة تنعرض فقط لو مربوطة بمنشور ظاهر */
    mediaFile(name) {
        if (!MEDIA_RE.test(name))
            return null;
        const m = this.d.media[name];
        if (!m || m.post === null)
            return null;
        const p = this.d.posts.find((x) => x.id === m.post);
        if (!p || !this.visible(p))
            return null;
        try {
            const buf = this.mediaDir ? readFileSync(path.join(this.mediaDir, name)) : this.mem.get(name);
            return buf ? { buf, type: m.type } : null;
        }
        catch {
            return null;
        }
    }
    dropMediaFile(name) {
        if (!name)
            return;
        if (!this.mediaDir) {
            this.mem.delete(name);
            return;
        }
        try {
            const f = path.join(this.mediaDir, name);
            if (existsSync(f))
                unlinkSync(f);
        }
        catch (e) {
            this.dep.log('community_media_unlink_failed', { code: e.code ?? '' });
        }
    }
    /* ---------- الإدارة ---------- */
    reports(status) {
        const list = this.d.reports.filter((r) => status === 'all' || r.status === (status || 'open')).slice(-200).reverse();
        return { list: list.map((r) => ({ id: r.id, kind: r.kind, target: r.target, reason: r.reason, note: r.note, at: r.at, status: r.status, by: this.dep.nameOf(r.by) || 'لاعب', author: this.dep.nameOf(r.snap.author) || 'لاعب', authorId: r.snap.author, text: r.snap.text, media: !!r.snap.media, decidedBy: r.decidedBy ?? null, decidedAt: r.decidedAt ?? null, decision: r.decision ?? null, exists: r.kind === 'post' ? this.d.posts.some((p) => p.id === r.target) : this.d.comments.some((c) => c.id === r.target) })), open: this.d.reports.filter((r) => r.status === 'open').length };
    }
    /** قرار الإدارة: remove يحذف المحتوى (المنشور/التعليق) ويغلق كل البلاغات المفتوحة عليه؛ dismiss يغلق البلاغ بدون حذف */
    decide(rid, action, actorName, why) {
        const r = this.d.reports.find((x) => x.id === Number(rid));
        if (!r)
            throw new CommunityError(404, 'بلاغ غير موجود.');
        if (r.status !== 'open')
            throw new CommunityError(409, 'البلاغ متخذ فيه قرار من قبل.');
        let media = null;
        this.tx(() => {
            const same = this.d.reports.filter((x) => x.kind === r.kind && x.target === r.target && x.status === 'open');
            if (action === 'remove') {
                if (r.kind === 'post') {
                    const p = this.d.posts.find((x) => x.id === r.target);
                    if (p) {
                        media = p.media;
                        this.purgePost(p);
                    }
                }
                else {
                    const c = this.d.comments.find((x) => x.id === r.target);
                    if (c)
                        this.purgeComment(c);
                }
            }
            for (const x of (action === 'remove' ? same : [r])) {
                x.status = action === 'remove' ? 'removed' : 'dismissed';
                x.decidedBy = actorName;
                x.decidedAt = this.now();
                x.decision = why;
            }
            // بلاغات على تعليقات انحذفت مع المنشور تنقفل بنفس القرار
            if (action === 'remove')
                for (const x of this.d.reports)
                    if (x.status === 'open' && x.kind === 'comment' && !this.d.comments.some((c) => c.id === x.target)) {
                        x.status = 'removed';
                        x.decidedBy = actorName;
                        x.decidedAt = this.now();
                        x.decision = why + ' (حُذف مع المنشور)';
                    }
        });
        this.dropMediaFile(media);
        return { ok: true, author: r.snap.author };
    }
    /** R67ae: إدارة المنشورات — آخر المنشورات مع بحث، وحذف إداري */
    adminPosts(q, limit = 60) {
        const t = q.trim().toLowerCase();
        const list = [...this.d.posts].reverse().filter((p) => !t || p.text.toLowerCase().includes(t) || this.dep.nameOf(p.by).toLowerCase().includes(t)).slice(0, Math.max(1, Math.min(200, limit)));
        return list.map((p) => ({ id: p.id, author: this.dep.nameOf(p.by), authorId: p.by, text: p.text.slice(0, 300), media: p.media ? '/api/community/media/' + p.media : null, at: p.at, likes: p.likes.length, comments: this.d.comments.filter((c) => c.post === p.id).length }));
    }
    adminDeletePost(id) {
        const p = this.post(id);
        const media = p.media;
        this.tx(() => this.purgePost(p));
        this.dropMediaFile(media);
        return { author: p.by };
    }
    /** R67ae: حذف الحساب — يمسح منشورات اللاعب وتعليقاته ومتابعاته */
    purgeUser(id) {
        const mine = this.d.posts.filter((p) => p.by === id);
        const media = mine.map((p) => p.media).filter(Boolean);
        this.tx(() => {
            for (const p of mine)
                this.purgePost(p);
            for (const c of this.d.comments.filter((x) => x.by === id))
                if (this.d.comments.includes(c))
                    this.purgeComment(c);
            delete this.d.follows[id];
            for (const k of Object.keys(this.d.follows))
                this.d.follows[k] = this.d.follows[k].filter((x) => x !== id);
            this.d.notifs = this.d.notifs.filter((n) => n.to !== id && n.from !== id);
        });
        for (const m of media)
            this.dropMediaFile(m);
        return mine.length;
    }
    /** R67ae: عدد البلاغات على محتوى لاعب */
    /** R68y: تفاصيل البلاغات ضد لاعب (لسجل اللاعب) */
    reportsListAgainst(id, n = 30) { return this.d.reports.filter((r) => r.snap.author === id).slice(-n).reverse().map((r) => ({ at: r.at, reason: r.reason, note: r.note, status: r.status, by: this.dep.nameOf(r.by) || 'لاعب', text: r.snap.text.slice(0, 120) })); }
    reportsAgainst(id) { const l = this.d.reports.filter((r) => r.snap.author === id); return { total: l.length, open: l.filter((r) => r.status === 'open').length, removed: l.filter((r) => r.status === 'removed').length }; }
    openReports() { return this.d.reports.filter((r) => r.status === 'open').length; }
    counts() { return { posts: this.d.posts.length, comments: this.d.comments.length, reports: this.openReports() }; }
}
export function communityHttp(c, h) {
    return async function handle(req, res, url, user) {
        if (!url.pathname.startsWith('/api/community/'))
            return false;
        const seg = url.pathname.slice('/api/community/'.length).split('/').filter(Boolean);
        const [a, id, act] = seg;
        const M = req.method ?? 'GET';
        const me = user?.id ?? null;
        try {
            // الصور: عامة لكن فقط المربوطة بمنشور ظاهر
            if (a === 'media' && id && !act && (M === 'GET' || M === 'HEAD')) {
                const f = c.mediaFile(id);
                if (!f)
                    return h.json(res, 404, { error: 'غير موجودة.' }), true;
                res.writeHead(200, { ...h.security, 'Content-Type': f.type, 'Content-Length': f.buf.length, 'Cache-Control': 'public, max-age=3600', 'Content-Disposition': 'inline' });
                return res.end(M === 'HEAD' ? undefined : f.buf), true;
            }
            const rk = me ?? 'ip:' + h.ipOf(req);
            if (M === 'GET') {
                c.rate('read', rk);
                if (a === 'feed' && !id)
                    return h.json(res, 200, c.feed(me, { before: url.searchParams.get('before'), scope: url.searchParams.get('scope'), limit: url.searchParams.get('limit') })), true;
                if (a === 'post' && id && !act)
                    return h.json(res, 200, c.postDetail(me, id)), true;
                if (a === 'user' && id && !act) {
                    const profile = c.profile(me, id, url.searchParams.get('before'));
                    if (me && !url.searchParams.get('before')) {
                        try {
                            h.onProfileView?.(me, id);
                        }
                        catch { /* تسجيل الزيارة ما يوقف عرض الملف */ }
                    }
                    return h.json(res, 200, { ...profile, relations: h.publicRelations?.(id, me) ?? { couple: null } }), true;
                }
                if (a === 'user' && id && (act === 'followers' || act === 'following'))
                    return h.json(res, 200, c.followList(id, act, me)), true;
                if (a === 'me' && !id)
                    return me ? (h.json(res, 200, { pub: c.pub(me), unread: c.unread(me) }), true) : (h.json(res, 401, { error: 'سجّل دخولك أول.' }), true);
                if (a === 'notifs' && !id)
                    return me ? (h.json(res, 200, c.notifs(me)), true) : (h.json(res, 401, { error: 'سجّل دخولك أول.' }), true);
                if (a === 'relations' && !id)
                    return me ? (h.json(res, 200, c.relations(me)), true) : (h.json(res, 401, { error: 'سجّل دخولك أول.' }), true);
                return h.json(res, 404, { error: 'غير موجود.' }), true;
            }
            // كل الكتابة: جلسة + نفس المصدر
            if (!me || !user)
                return h.json(res, 401, { error: 'سجّل دخولك أول عشان تشارك بالمجتمع.' }), true;
            if (!h.sameOrigin(req))
                return h.json(res, 403, { error: 'طلب من مصدر غير مسموح.' }), true;
            h.touch(me, user.name);
            if (a === 'media' && !id && M === 'POST') {
                const ct = String(req.headers['content-type'] ?? '').split(';')[0].trim();
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(ct))
                    return h.json(res, 415, { error: 'نوع الملف غير مدعوم. المسموح: JPG وPNG وWebP.' }), true;
                if (Number(req.headers['content-length'] ?? 0) > MEDIA_MAX)
                    return h.json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 700 كيلوبايت بعد التصغير.' }), true;
                const chunks = [];
                let size = 0, big = false;
                await new Promise((resolve) => {
                    req.on('data', (b) => { size += b.length; if (size > MEDIA_MAX) {
                        big = true;
                        resolve();
                        req.destroy();
                    }
                    else
                        chunks.push(b); });
                    req.on('end', () => resolve());
                    req.on('error', () => resolve());
                });
                if (big)
                    return h.json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 700 كيلوبايت بعد التصغير.' }), true;
                return h.json(res, 200, c.uploadMedia(me, Buffer.concat(chunks), ct)), true;
            }
            let b = {};
            try {
                const raw = await h.readBody(req, 4096);
                const j = raw ? JSON.parse(raw) : {};
                if (!j || typeof j !== 'object' || Array.isArray(j))
                    throw 0;
                b = j;
            }
            catch {
                return h.json(res, 400, { error: 'بيانات غير صالحة.' }), true;
            }
            if (a === 'posts' && !id && M === 'POST')
                return h.json(res, 200, { post: c.createPost(me, b) }), true;
            if (a === 'post' && id && !act && M === 'PATCH')
                return h.json(res, 200, { post: c.editPost(me, id, b) }), true;
            if (a === 'post' && id && !act && M === 'DELETE')
                return h.json(res, 200, c.deletePost(me, id)), true;
            if (a === 'post' && id && act === 'like' && M === 'POST')
                return h.json(res, 200, c.like(me, id, b.on)), true;
            if (a === 'post' && id && act === 'comments' && M === 'POST')
                return h.json(res, 200, c.comment(me, id, b)), true;
            if (a === 'comment' && id && !act && M === 'DELETE')
                return h.json(res, 200, c.deleteComment(me, id)), true;
            if (a === 'user' && id && act === 'follow' && M === 'POST')
                return h.json(res, 200, c.follow(me, id, b.on)), true;
            if (a === 'user' && id && (act === 'block' || act === 'mute') && M === 'POST')
                return h.json(res, 200, c.setRel(me, id, act, b.on)), true;
            if (a === 'notifs' && id === 'read' && M === 'POST')
                return h.json(res, 200, c.markRead(me, b.ids)), true;
            if (a === 'report' && !id && M === 'POST')
                return h.json(res, 200, c.report(me, b)), true;
            return h.json(res, 404, { error: 'غير موجود.' }), true;
        }
        catch (e) {
            if (e instanceof CommunityError)
                return h.json(res, e.status, { error: e.message, code: e.code }), true;
            if (e instanceof StorageError)
                return h.json(res, 503, { error: 'تعذّر الحفظ الآن، وما تغيّر شي. جرّب بعد شوي.', code: 'storage' }), true;
            throw e;
        }
    };
}
