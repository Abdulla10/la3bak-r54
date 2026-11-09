/* R62: عرض الشحن الأول — أول عملية شحن ناجحة (دفع حقيقي) للاعب تاخذ نفس الكمية هدية فوقها (ضعف الباقة).
   - مرة وحدة بالعمر لكل حساب (مفتاح ثابت firstbonus:<الحساب>)، ولها حد أعلى (10,000 جوهرة / 1,000,000 عملة).
   - لو الطلب انسترجع (Refund)، الهدية تنسحب بعملية إدارية بمفتاح ثابت. لو الرصيد ما يكفي تنسجل للمراجعة بالسجل.
   - FIRST_TOPUP_BONUS=0 يطفيها، أو رقم نسبة (100 = ضعف). عمليات وضع التجربة (Sandbox) ما تاخذ هدية إلا بـ FIRST_TOPUP_TEST=1.
   منطق الدفع والمحفظة نفسه ما تغيّر — هذي منحة منفصلة بعد ما الدفع يتأكد. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
const valid = (v) => v.v === 1 && isObj(v.granted);
export const FIRST_TOPUP_CAP = Object.freeze({ gems: 10_000, coins: 1_000_000 });
export class FirstTopup {
    deps;
    now;
    d = { v: 1, granted: {} };
    disk;
    basePercent;
    allowTest;
    /** R67ae: المالك يقدر يغيّر النسبة من اللوحة (-1 = حسب إعداد الخادم) */
    get percent() { const o = this.deps.percentOverride?.(); return typeof o === 'number' && o >= 0 ? Math.min(200, Math.floor(o)) : this.basePercent; }
    constructor(file, deps, mon = new StorageMonitor(), now = Date.now) {
        this.deps = deps;
        this.now = now;
        if (file) {
            const l = loadJsonFile(file, valid);
            if (l)
                this.d = l;
        }
        this.disk = new Persister('first-topup', file, () => this.d, now, mon, valid);
        const p = Number(process.env.FIRST_TOPUP_BONUS ?? 100);
        this.basePercent = Number.isFinite(p) ? Math.max(0, Math.min(200, Math.floor(p))) : 0;
        this.allowTest = process.env.FIRST_TOPUP_TEST === '1';
    }
    eligible(user) { return this.percent > 0 && !this.d.granted[user]; }
    onPaid(user, o) {
        if (!this.eligible(user) || (o.mode !== 'live' && !this.allowTest))
            return 0;
        const bonus = Math.min(Math.floor(o.amount * this.percent / 100), FIRST_TOPUP_CAP[o.cur]);
        if (bonus <= 0)
            return 0;
        this.d.granted[user] = { orderId: o.id, cur: o.cur, bonus, at: this.now() };
        this.disk.mustSave();
        if (!this.deps.grant(user, o.cur, bonus, 'هدية أول شحن 🎁', `firstbonus:${user}`))
            this.deps.log?.('first_topup_grant_failed', { order: o.id });
        return bonus;
    }
    onRefunded(user, orderId) {
        const r = this.d.granted[user];
        if (!r || r.orderId !== orderId || r.clawed)
            return;
        const ok = this.deps.debit(user, r.cur, r.bonus, 'سحب هدية أول شحن (الطلب انسترجع)', `firstbonus-claw:${user}`);
        r.clawed = ok;
        if (!ok) {
            r.clawFailed = true;
            this.deps.log?.('first_topup_claw_failed', { order: orderId });
        }
        this.disk.save();
    }
}
