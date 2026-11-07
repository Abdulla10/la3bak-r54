import { QUIZ_DEFS } from '../engine/quiz-games.js';
const GULF_MS = 4 * 3600_000;
const DAILY_KINDS = ['trivia', 'capitals', 'islamic', 'sports', 'gulf', 'kidsscience']; // حُذفت «صح أو خطأ» و«حساب سريع» من المنصة
/** تاريخ اليوم بتوقيت الخليج بصيغة YYYY-MM-DD */
export const dailyKey = (now) => new Date(now + GULF_MS).toISOString().slice(0, 10);
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** نفس الأسئلة لكل الناس في نفس اليوم (تتولد من التاريخ) */
export function dailyQuestions(now, n = 5) {
    const key = dailyKey(now);
    return { date: key, questions: questionsFromSeed(key, n) };
}
/** تحدي صديق: نفس الأسئلة لكل من يفتح الرابط (تتولد من الرمز) */
export const cleanSeed = (s) => (/^[a-z0-9]{4,12}$/.test(s) ? s : '');
export function challengeQuestions(seed, n = 5) {
    return { seed, questions: questionsFromSeed('c:' + seed, n) };
}
function questionsFromSeed(key, n) {
    const rng = mulberry32([...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17));
    const defs = QUIZ_DEFS.filter((d) => DAILY_KINDS.includes(d.info.id));
    const used = [];
    const questions = [];
    for (let i = 0; i < n; i++) {
        const d = defs[Math.floor(rng() * defs.length)];
        const q = d.make(rng, used);
        used.push(q.key);
        questions.push({ prompt: q.prompt, big: q.big, options: q.options, answer: q.answer, kind: d.info.id });
    }
    return questions;
}
