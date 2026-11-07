import { GIFT_REWARD_POLICY, quoteGiftRewards } from './gift-rewards.js';
import { FunctionalHttpError } from './functional-http.js';
import { PRICE_MAX } from './wallet.js';
import { shopEligibility } from './shopcatalog.js';
const uuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const exact = (b, allowed) => Object.keys(b).every(k => allowed.includes(k));
const codes = { bad: 'بيانات العملية مب صالحة.', conflict: 'مفتاح العملية مستخدم لطلب مختلف.', noto: 'الحساب غير متاح.', poor: 'رصيدك ما يكفي للعملية.', self: 'ما تقدر تستلم من حقيبتك أو تكافئ نفسك.', early: 'الحقيبة ما انفتحت بعد.', expired: 'انتهى وقت الاستلام.', full: 'تم استلام كل محتوى الحقيبة.', claimed: 'استلمت من هالحقيبة بالفعل.', owned: 'تملك هالغرض بالفعل؛ مكانك يبقى متاحًا لعضو آخر.', ineligible: 'ما استوفيت شروط امتلاك هالغرض.', overflow: 'العملية تتجاوز الحد الآمن للرصيد.', empty: 'هالهدية المسبقة الدفع استُخدمت بالفعل.', missing: 'الحقيبة أو الهدية غير موجودة.' };
function checked(v) { const r = v; if (r?.ok === false)
    throw new FunctionalHttpError(r.status ?? (['conflict', 'claimed', 'full', 'owned', 'empty'].includes(r.code ?? '') ? 409 : r.code === 'ineligible' ? 403 : 400), codes[r.code ?? ''] ?? r.error ?? 'تعذّر تنفيذ العملية.'); return v; }
function validKey(b) { if (typeof b.key !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(b.key))
    throw new FunctionalHttpError(400, 'معرّف العملية مب صالح.'); return b.key; }
export function wireSocialBenefitsRoutes(http, deps) {
    const allow = (id) => { if (!deps.eligible(id))
        throw new FunctionalHttpError(403, 'القسم الاجتماعي غير متاح لهالحساب.'); };
    const itemOffer = (id) => { const item = deps.shop.get(id); if (!item || !item.active || item.status !== 'available' || item.currency !== 'gems' || !item.permanent || item.proposalOnly || !positive(item.price) || item.price > PRICE_MAX.gems)
        throw new FunctionalHttpError(400, 'الغرض غير متاح بسعر جواهر معتمد.'); return { type: 'item', id: item.id, slot: item.slot, price: item.price, currency: 'gems', permanent: true, available: true }; };
    const giftOffer = (id) => { const gift = deps.gifts.get(id); if (!gift?.active || !positive(gift.price) || gift.price > PRICE_MAX.gems)
        throw new FunctionalHttpError(400, 'الهدية غير متاحة بسعر حقيبة معتمد.'); return { type: 'gift', id: gift.id, name: gift.name, icon: gift.icon, price: gift.price, currency: 'gems', active: true }; };
    const publicBag = (bag) => {
        const type = bag.offer.type;
        const item = type === 'item' ? deps.shop.get(bag.offer.id) : null;
        const gift = type === 'gift' ? deps.gifts.get(bag.offer.id) : null;
        return { id: bag.id, roomId: bag.room, sender: { id: deps.publicId(bag.senderId), name: deps.nameOf(bag.senderId) }, type, offer: bag.offer,
            name: type === 'coins' ? 'حقيبة العملات الذهبية' : item?.name ?? gift?.name ?? 'محتوى الحقيبة', currency: type === 'coins' ? 'coins' : 'gems',
            count: bag.count, total: bag.total, perRecipient: type === 'coins' ? bag.offer.perRecipient : 1, remaining: bag.remaining, remainingCount: bag.remaining, claimedCount: bag.count - bag.remaining, claimed: bag.claimed, claimedByMe: bag.claimed, status: bag.status,
            createdAt: bag.createdAt, opensAt: bag.opensAt, expiresAt: bag.expiresAt, refunded: bag.refunded, refund: bag.refunded > 0 ? { amount: bag.refunded, currency: type === 'coins' ? 'coins' : 'gems' } : null, ...(item ? { item: { id: item.id, name: item.name, slot: item.slot, css: item.css, art: item.art, permanent: true } } : {}), ...(gift ? { gift: { id: gift.id, name: gift.name, motif: gift.motif, variant: gift.variant, fx: gift.fx } } : {}) };
    };
    http.add('GET', '/api/social/rooms/:roomId/benefits', async ({ user, params }) => {
        allow(user.id);
        const detail = checked(await deps.rooms.detail(user.id, params.roomId));
        return checked(await deps.rooms.withRoomBenefitAccess(user.id, params.roomId, null, async (room) => {
            const bags = deps.wallet.listLuckyBags(room.roomId, user.id).slice(-100).map(publicBag);
            const items = deps.shop.all().filter(it => it.active && it.status === 'available' && it.currency === 'gems' && it.permanent && !it.proposalOnly && positive(it.price) && it.price <= PRICE_MAX.gems)
                .map(it => ({ id: it.id, name: it.name, price: it.price, currency: 'gems', slot: it.slot, art: it.art, css: it.css, permanent: true, eligible: shopEligibility(it, deps.ranks(user.id)).eligible }));
            const gifts = deps.gifts.active().filter(g => positive(g.price) && g.price <= PRICE_MAX.gems).map(g => ({ id: g.id, name: g.name, price: g.price, currency: 'gems', motif: g.motif, variant: g.variant, fx: g.fx, rewards: quoteGiftRewards(g.price) }));
            const inventory = deps.wallet.prepaidGiftInventory(user.id).filter(c => c.remaining > 0).map(c => { const g = deps.gifts.get(c.gift.id); return { id: c.id, creditId: c.id, bagId: c.bagId, giftId: c.gift.id, name: c.gift.name, price: c.gift.price, quantity: c.remaining, remaining: c.remaining, value: c.value, motif: g?.motif ?? 'legacy:' + c.gift.id, variant: g?.variant ?? 0, active: g?.active === true, rewards: quoteGiftRewards(c.gift.price) }; });
            return { ok: true, coins: deps.wallet.balance(user.id), gems: deps.wallet.gems(user.id), now: Date.now(), roomId: room.roomId, selfId: deps.publicId(user.id),
                maxRecipients: Math.min(49, room.maxMembers - 1), permissions: { createBag: room.canCreateBag, sendReward: room.owner },
                members: detail.room?.members ?? [], giftMembers: detail.room?.councils?.find((c) => c.id === detail.current?.councilId)?.members ?? [], councilId: detail.current?.councilId ?? null, offers: { items, gifts }, bags, inventory };
        }));
    });
    http.add('POST', '/api/social/rooms/:roomId/benefits', async ({ user, params, body }) => {
        allow(user.id);
        const key = validKey(body);
        if (typeof body.command !== 'string')
            throw new FunctionalHttpError(400, 'اختر العملية المطلوبة.');
        if (body.command === 'gift:redeem') {
            if (!exact(body, ['command', 'key', 'creditId', 'to', 'councilId', 'seenPolicy']) || !uuid(body.creditId) || !uuid(body.councilId) || typeof body.to !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(body.to))
                throw new FunctionalHttpError(400, 'بيانات استخدام الهدية مب صالحة.');
            const to = deps.resolvePublic(body.to);
            if (!to || !deps.eligible(to))
                throw new FunctionalHttpError(404, 'المستلم غير متاح.');
            const result = await deps.rooms.withGiftAccess(user.id, params.roomId, body.councilId, to, async (scope) => {
                const prior = deps.wallet.luckyReceiptByKey(user.id, key), request = prior?.request;
                if (request && (request.op !== 'redeem' || request.creditId !== body.creditId || request.to !== to || request.room !== scope))
                    throw new FunctionalHttpError(409, 'مفتاح العملية مستخدم لطلب مختلف.');
                const credit = deps.wallet.prepaidGiftInventory(user.id).find(c => c.id === body.creditId);
                if (!prior && (!credit || !deps.gifts.get(credit.gift.id)?.active))
                    throw new FunctionalHttpError(400, 'الهدية المسبقة الدفع غير متاحة.');
                if (!prior && body.seenPolicy !== GIFT_REWARD_POLICY.id)
                    throw new FunctionalHttpError(409, 'حدّث حسبة الهدية الممولة قبل استخدامها.');
                const r = checked(deps.wallet.redeemPrepaidGift(user.id, to, body.creditId, key, request?.op === 'redeem' ? request.fromName : deps.nameOf(user.id) || user.name, request?.op === 'redeem' ? request.toName : deps.nameOf(to), { room: scope }));
                const rec = r.rec, g = deps.gifts.get(rec.gift) ?? { id: rec.gift, name: rec.name, cat: 'normal', rarity: 0, fx: 'pop', motif: 'legacy:' + rec.gift, variant: 0, icon: rec.icon };
                const ev = { k: 'gift', tx: rec.id, ts: rec.ts, from: { id: deps.publicId(user.id), name: rec.fromName }, to: { id: deps.publicId(to), name: rec.toName }, gift: { id: g.id, name: g.name, cat: g.cat, rarity: g.rarity, fx: g.fx, motif: g.motif, variant: g.variant, icon: g.icon, price: rec.price, currency: 'gems' }, qty: 1, total: rec.total, recv: rec.recv, house: rec.house, cur: rec.cur ?? 'gems', rewardCur: rec.rewardCur ?? rec.cur ?? 'gems', ...(rec.rewardPolicy ? { rewardPolicy: rec.rewardPolicy, senderBonus: rec.senderBonus } : {}), prepaid: true };
                return { ok: true, dup: r.dup, coins: deps.wallet.balance(user.id), gems: deps.wallet.gems(user.id), ev, creditId: body.creditId };
            });
            const out = checked(result);
            try {
                deps.changed(params.roomId);
            }
            catch { }
            return out;
        }
        return checked(await deps.rooms.withRoomBenefitAccess(user.id, params.roomId, body.command === 'reward:send' && typeof body.to === 'string' ? deps.resolvePublic(body.to) : null, async (room) => {
            let out;
            if (body.command === 'bag:create') {
                if (!room.canCreateBag)
                    throw new FunctionalHttpError(403, 'إرسال حقيبة الحظ غير متاح لدورك في هالغرفة.');
                if (!exact(body, ['command', 'key', 'type', 'itemId', 'perRecipient', 'count', 'delay', 'seenTotal', 'confirm']) || !positive(body.count) || body.count > Math.min(49, room.maxMembers - 1) || (body.delay !== 0 && body.delay !== 300) || !positive(body.seenTotal) || body.confirm !== true)
                    throw new FunctionalHttpError(400, 'راجع العدد والمبلغ ووقت الإرسال ثم أكّد العملية.');
                let offer;
                const prior = deps.wallet.luckyReceiptByKey(user.id, key);
                if (prior) {
                    const previous = prior.request;
                    if (previous.op !== 'create' || previous.room !== room.roomId || previous.count !== body.count || previous.delay !== body.delay || previous.offer.type !== body.type || (previous.offer.type === 'coins' ? (previous.offer.perRecipient !== body.perRecipient || body.itemId !== undefined) : (previous.offer.id !== body.itemId || body.perRecipient !== undefined)))
                        throw new FunctionalHttpError(409, 'مفتاح العملية مستخدم لطلب مختلف.');
                    offer = previous.offer;
                }
                else if (body.type === 'coins') {
                    if (!positive(body.perRecipient) || body.itemId !== undefined)
                        throw new FunctionalHttpError(400, 'حدد مبلغ عملات صحيحًا لكل مستلم.');
                    offer = { type: 'coins', perRecipient: body.perRecipient };
                }
                else if (body.type === 'item' || body.type === 'gift') {
                    if (body.perRecipient !== undefined)
                        throw new FunctionalHttpError(400, 'سعر الغرض أو الهدية يحدده الخادم.');
                    offer = body.type === 'item' ? itemOffer(body.itemId) : giftOffer(body.itemId);
                }
                else
                    throw new FunctionalHttpError(400, 'نوع الحقيبة مب صالح.');
                const total = (offer.type === 'coins' ? offer.perRecipient : offer.price) * body.count;
                if (!Number.isSafeInteger(total) || total <= 0 || total > PRICE_MAX[offer.type === 'coins' ? 'coins' : 'gems'])
                    throw new FunctionalHttpError(400, 'مبلغ الحقيبة يتجاوز الحد المسموح.');
                if (total !== body.seenTotal)
                    throw new FunctionalHttpError(409, 'تغير السعر؛ راجع الإجمالي وأكد طلبًا جديدًا.');
                out = checked(deps.wallet.createLuckyBag(user.id, room.roomId, offer, body.count, body.delay, key));
            }
            else if (body.command === 'bag:claim') {
                if (!exact(body, ['command', 'key', 'bagId']) || !uuid(body.bagId))
                    throw new FunctionalHttpError(400, 'معرّف الحقيبة مب صالح.');
                const bag = deps.wallet.luckyBagView(body.bagId, user.id);
                if (!bag || bag.room !== room.roomId)
                    throw new FunctionalHttpError(404, 'الحقيبة غير موجودة في هالغرفة.');
                const itemEligible = bag.offer.type === 'item' ? (() => { const it = deps.shop.get(bag.offer.id); return !!it && it.active && it.status === 'available' && !it.proposalOnly && shopEligibility(it, deps.ranks(user.id)).eligible; })() : undefined;
                const prior = deps.wallet.luckyReceiptByKey(user.id, key);
                if (prior && (prior.request.op !== 'claim' || prior.request.bagId !== body.bagId))
                    throw new FunctionalHttpError(409, 'مفتاح العملية مستخدم لطلب مختلف.');
                if (!prior && bag.offer.type === 'gift' && !deps.gifts.get(bag.offer.id)?.active)
                    throw new FunctionalHttpError(400, 'محتوى هالحقيبة غير متاح حاليًا.');
                out = checked(deps.wallet.claimLuckyBag(user.id, body.bagId, key, { itemEligible }));
            }
            else if (body.command === 'reward:send') {
                if (!room.owner)
                    throw new FunctionalHttpError(403, 'مكافأة الغرفة من مالكها فقط.');
                if (!exact(body, ['command', 'key', 'to', 'amount', 'confirm']) || typeof body.to !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(body.to) || !room.targetId || !positive(body.amount) || body.amount > PRICE_MAX.gems || body.confirm !== true)
                    throw new FunctionalHttpError(400, 'اختر عضوًا ومبلغ جواهر صحيحًا ثم أكّد المكافأة.');
                const reward = checked(deps.wallet.sendRoomReward(user.id, room.targetId, body.amount, key, room.roomId));
                out = { ok: true, dup: reward.dup, rewardId: reward.rewardId };
            }
            else
                throw new FunctionalHttpError(400, 'العملية غير مسموحة.');
            try {
                deps.changed(room.roomId);
            }
            catch { }
            return { ...out, ok: true, coins: deps.wallet.balance(user.id), gems: deps.wallet.gems(user.id), now: Date.now() };
        }));
    });
    return http;
}
