export function clone(v) {
    return JSON.parse(JSON.stringify(v));
}
export function shuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
export function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}
/** الأعلى نقاطاً (مع التعادل). لو الكل صفر ما فيه فائز. */
export function topOf(scores) {
    const max = Math.max(...Object.values(scores));
    return { winners: max > 0 ? Object.keys(scores).filter((k) => scores[k] === max) : [], scores };
}
