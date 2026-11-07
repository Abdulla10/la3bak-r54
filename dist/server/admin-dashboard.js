import { gulfDay } from './platform.js';
const DAY = 86_400_000, DUBAI_OFFSET = 4 * 3_600_000;
/** The current Dubai calendar day is included; no browser/server-local timezone is used. */
export function dashboardWindow(period, at) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const today = Date.parse(gulfDay(at) + 'T00:00:00.000Z') - DUBAI_OFFSET;
    const start = today - (days - 1) * DAY;
    return { days, today, start, priorStart: start - days * DAY };
}
/** Reads existing summaries only. Never ensures accounts, touches wallets or calls a payment provider. */
export function adminDashboard(d, rooms, period, at, owner) {
    const window = dashboardWindow(period, at), players = d.accounts.all(), catalog = d.registry.list();
    const games = new Map(catalog.map(g => [g.id, g.name]));
    const additions = new Map();
    let total = 0;
    for (const p of players) {
        if (p.since > at)
            continue;
        if (p.since < window.start)
            total++;
        else {
            const day = gulfDay(p.since);
            additions.set(day, (additions.get(day) ?? 0) + 1);
        }
    }
    const growth = Array.from({ length: window.days }, (_, i) => {
        const day = gulfDay(window.start + i * DAY), added = additions.get(day) ?? 0;
        total += added;
        return { day, total, added };
    });
    // Each completion is copied into every participant's history. Only Accounts' permanent
    // recorded keys prove that it was recorded. Those keys have no timestamps of their own.
    // A complete retained union proves dates for ALL keys; anything less is deliberately null.
    const completions = new Map();
    let consistent = true;
    for (const p of players)
        for (const h of d.accounts.adminProfile(p.id)?.history ?? []) {
            if (!d.accounts.hasRecorded(h.key))
                continue;
            const old = completions.get(h.key);
            if (old && (old.ts !== h.ts || old.game !== h.game))
                consistent = false;
            completions.set(h.key, { ts: h.ts, game: h.game });
        }
    const complete = consistent && completions.size === d.accounts.recordedCount();
    const todayMatches = [...completions.values()].filter(h => h.ts >= window.today && h.ts <= at).length;
    const matchesToday = {
        value: complete ? todayMatches : null,
        complete,
        note: complete
            ? 'مباريات مسجّلة فريدة اليوم بتوقيت دبي؛ مفتاح إتمام اللعبة محسوب مرة واحدة مهما كان عدد المشاركين.'
            : 'غير متاح بدقة: قراءة الإدارة تحتفظ بآخر 20 مشاركة لكل حساب؛ لا توجد تواريخ لكل مفاتيح المباريات المسجّلة. لا نعرض السجل المبتور كعدد مباريات اليوم.',
    };
    const gameTotals = Object.entries(d.accounts.gameTotals()).filter(([id, stat]) => games.has(id) && stat.played > 0)
        .map(([id, stat]) => ({ id, name: games.get(id), matches: stat.played, definition: 'مشاركات اللاعبين في ألعاب مكتملة، وليست عدد مباريات فريدة؛ إجمالي كل الفترات.' }))
        .sort((a, b) => b.matches - a.matches || a.id.localeCompare(b.id));
    const status = d.payments?.status() ?? { enabled: false, mode: 'disabled', reason: 'payments_not_connected' };
    const live = owner ? d.payments?.adminDashboard(at, window.start, window.priorStart) ?? {
        grossMinor: 0, refundedMinor: 0, netMinor: 0, currentMinor: 0, previousMinor: 0, changePct: null,
        distribution: [{ id: 'coins', label: 'باقات العملات', minor: 0 }, { id: 'gems', label: 'باقات الجواهر', minor: 0 }], latest: [],
    } : null;
    const products = d.shopcat.all();
    return {
        period, timezone: 'Asia/Dubai', growth,
        activePlayers: { value: [...d.sockets.values()].filter(s => s.size > 0).length, definition: 'لاعبون متصلون الآن باتصال WebSocket واحد على الأقل؛ ليس نشاطاً يومياً أو خلال الفترة، فلا يوجد آخر نشاط محفوظ.' },
        matchesToday,
        activeGames: { value: new Set(rooms.filter(r => r.status !== 'finished' && games.has(r.gameId)).map(r => r.gameId)).size, definition: 'أنواع الألعاب المتاحة ذات غرفة غير منتهية الآن (انتظار أو لعب)، لا عدد الغرف.' },
        gameTotals,
        commerce: {
            enabled: status.enabled, mode: status.mode, live,
            note: (owner ? '' : 'المبالغ وتفاصيل المدفوعات للمالك فقط. ') + (!status.enabled ? `بوابة الدفع غير مفعّلة (${status.reason}). ` : status.mode === 'test' ? 'البوابة في وضع الاختبار؛ لا تُعد عمليات الاختبار إيراداً حقيقياً. ' : '')
                + 'إيراد AED مؤكد لوضع live فقط، دون اختبار أو فشل أو طلب غير مؤكد. الإجماليات لكل الفترات؛ الحالي وصافي السابق حسب أول وقت تحقق محفوظ للقبض والاسترجاع. الفترة الحالية تشمل اليوم الجزئي في دبي، والسابقة الأيام الكاملة السابقة بنفس عدد الأيام. التوزيع إجمالي القبض خلال الفترة الحالية حسب نوع الباقة؛ الأحدث حالة مالية مؤكدة واحدة لكل طلب، لا حالة تسليم الرصيد.',
        },
        quick: { products: products.length, activeProducts: products.filter(p => p.active && p.status === 'available').length,
            events: d.platform.activeNotices(at).filter(n => n.kind === 'event').length, offers: null },
    };
}
