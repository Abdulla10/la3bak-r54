/**
 * قواعد بلوت «لعبك»: إعدادات ودوال نقية (بدون حالة ولا عشوائية) قابلة للاختبار.
 * مصدر كل قاعدة وقرار الاعتماد في `qawwi-baloot-test-table-ar.md` (معتمد 2026-11-01).
 * لا افتراضات قواعد خارج هذا الملف: المحرك `baloot.ts` يقرأ منه فقط.
 */
export const RULESET_VERSION = 'baloot-ksa-1';
export type Team = 0 | 1;
export type ContractType = 'hokm' | 'sun';
/** 1 = بلا مضاعف، 2 = دبل، 3 = ثري، 4 = فور (الحكم فقط) */
export type Level = 1 | 2 | 3 | 4;
export type ProjectKind = 'sira' | 'khamsin' | 'mia' | 'aces';

export const RULES = {
  version: RULESET_VERSION,
  target: 152,
  /** مجموع نقاط الجولة بدون مشاريع (حكم 16، صن 26) */
  total: { hokm: 16, sun: 26 } as Record<ContractType, number>,
  kaboot: { hokm: 25, sun: 44 } as Record<ContractType, number>,
  baloot: 2,
  /** المشاريع تُضرب في هذا الرقم تحت أي مضاعف (دبل/ثري/فور)، وبدون مضاعف ×1. البلوت لا يُضرب أبداً. */
  projectMultiplierCap: 2,
  /** أعلى مستوى مسموح لكل عقد: الصن بلا مضاعفات في هذه النسخة، والقهوة مؤجلة */
  maxLevel: { hokm: 4, sun: 1 } as Record<ContractType, number>,
  /** قيم المشاريع بنقاط اللعبة (حكم/صن) */
  projects: {
    sira: { hokm: 2, sun: 4 },
    khamsin: { hokm: 5, sun: 10 },
    mia: { hokm: 10, sun: 20 },
    aces: { hokm: 10, sun: 40 }, // أربع إكك: بالحكم 10، وبالصن أربعمية 40
  } as Record<ProjectKind, Record<ContractType, number>>,
} as const;

export const PROJECT_KINDS = Object.keys(RULES.projects) as ProjectKind[];
export const isProjectKind = (k: unknown): k is ProjectKind => typeof k === 'string' && (PROJECT_KINDS as string[]).includes(k);

// ---------- تحويل الأبناط إلى نقاط ----------

/** الصن: أقرب عشرة ثم ×2 ÷10، والآحاد 5 تبقى كما هي (35 ← 7). كل فريق يُحسب وحده ومجموعهما 26. */
export function sunPoints(abnat: number): number {
  const u = abnat % 10;
  return 2 * Math.floor(abnat / 10) + (u === 0 || u < 5 ? 0 : u === 5 ? 1 : 2);
}

/** الحكم: ÷10 والآحاد 5 (النصف) للأسفل: 155 ← 15، 156 ← 16. بأعداد صحيحة، لا Math.round. */
export function hokmPoints(abnat: number): number {
  return Math.floor(abnat / 10) + (abnat % 10 >= 6 ? 1 : 0);
}

/** الفريق الحاسب في الحكم: خصم آخر من رفع المضاعف (بلا مضاعف = الخصم، دبل = المشتري، ثري = الخصم، فور = المشتري) */
export const countingIsBuyer = (level: Level) => level === 2 || level === 4;

// ---------- المشاريع ----------

export interface ProjectItem { kind: ProjectKind; pts: number; top: number }
export interface HandCard { s: number; r: number }

/**
 * يكتشف أفضل مجموعة مشاريع بلا ورقة مكررة من يد 8 أوراق.
 *  - تسلسل 3 = سرا، 4 = خمسين، 5 فأكثر = مية (الترتيب الطبيعي 7 8 9 10 J Q K A).
 *  - أربع ورقات متساوية من 10 أو J أو Q أو K = مية، وأربع إكك = `aces`. أربع 9/8/7 ليست مشروعاً.
 */
export function detectProjects(hand: HandCard[], type: ContractType): ProjectItem[] {
  type Cand = { kind: ProjectKind; pts: number; top: number; mask: number };
  const idx = new Map<string, number>();
  hand.forEach((c, i) => idx.set(`${c.s}:${c.r}`, i));
  const cands: Cand[] = [];
  for (let s = 0; s < 4; s++) {
    for (let start = 7; start <= 12; start++) {
      for (let len = 3; len <= 5; len++) {
        const end = start + len - 1;
        if (end > 14) break;
        let mask = 0, ok = true;
        for (let r = start; r <= end; r++) {
          const i = idx.get(`${s}:${r}`);
          if (i === undefined) { ok = false; break; }
          mask |= 1 << i;
        }
        if (!ok) continue;
        const kind: ProjectKind = len === 3 ? 'sira' : len === 4 ? 'khamsin' : 'mia';
        cands.push({ kind, pts: RULES.projects[kind][type], top: end, mask });
      }
    }
  }
  for (const r of [10, 11, 12, 13, 14]) {
    let mask = 0, n = 0;
    for (let s = 0; s < 4; s++) { const i = idx.get(`${s}:${r}`); if (i !== undefined) { mask |= 1 << i; n++; } }
    if (n === 4) { const kind: ProjectKind = r === 14 ? 'aces' : 'mia'; cands.push({ kind, pts: RULES.projects[kind][type], top: r, mask }); }
  }
  // أفضل مجموعة غير متداخلة: أعلى مجموع نقاط ثم أعلى مجموع رتب
  let best: Cand[] = [], bestScore = [0, 0];
  const dfs = (from: number, used: number, picked: Cand[], sum: number, tops: number) => {
    if (sum > bestScore[0] || (sum === bestScore[0] && tops > bestScore[1])) { best = picked.slice(); bestScore = [sum, tops]; }
    for (let i = from; i < cands.length; i++) {
      if (cands[i].mask & used) continue;
      picked.push(cands[i]);
      dfs(i + 1, used | cands[i].mask, picked, sum + cands[i].pts, tops + cands[i].top);
      picked.pop();
    }
  };
  dfs(0, 0, [], 0, 0);
  return best.map(({ kind, pts, top }) => ({ kind, pts, top })).sort((a, b) => b.pts - a.pts || b.top - a.top);
}

export interface TeamProjects { pts: number; bestPts: number; bestTop: number }
export function summarizeProjects(items: ProjectItem[]): TeamProjects | null {
  if (!items.length) return null;
  let bestPts = 0, bestTop = 0, pts = 0;
  for (const p of items) { pts += p.pts; if (p.pts > bestPts || (p.pts === bestPts && p.top > bestTop)) { bestPts = p.pts; bestTop = p.top; } }
  return { pts, bestPts, bestTop };
}

/** فريق واحد أعلن: يسجّل دون منافسة. الاثنان: الأعلى قيمة ثم الأعلى رتبة، والتساوي التام لا أحد يسجّل. يرجع الفائز ونقاطه. */
export function compareProjects(a: ProjectItem[], b: ProjectItem[]): { winner: Team | null; pts: number } {
  const sa = summarizeProjects(a), sb = summarizeProjects(b);
  if (sa && !sb) return { winner: 0, pts: sa.pts };
  if (sb && !sa) return { winner: 1, pts: sb.pts };
  if (!sa || !sb) return { winner: null, pts: 0 };
  if (sa.bestPts !== sb.bestPts) return sa.bestPts > sb.bestPts ? { winner: 0, pts: sa.pts } : { winner: 1, pts: sb.pts };
  if (sa.bestTop !== sb.bestTop) return sa.bestTop > sb.bestTop ? { winner: 0, pts: sa.pts } : { winner: 1, pts: sb.pts };
  return { winner: null, pts: 0 };
}

// ---------- حساب الجولة ----------

export type RoundReason = 'normal' | 'buyer_failed' | 'kaboot';
export interface RoundInput {
  type: ContractType;
  buyer: Team;
  /** أبناط الأوراق لكل فريق (تشمل +10 للأكلة الأخيرة) */
  abnat: [number, number];
  tricksWon: [number, number];
  level: Level;
  /** المشاريع المعلنة لكل فريق (كل ما أعلنه لاعباه) */
  projects: [ProjectItem[], ProjectItem[]];
  /** الفريق صاحب بلوت أُعلن في وقته، أو null */
  baloot: Team | null;
}
export interface RoundResult {
  pts: [number, number];
  /** نقاط الأوراق لكل فريق قبل المضاعف والمشاريع والبلوت */
  cardPts: [number, number];
  /** نقاط المقارنة (أوراق + مشاريع فائزة + بلوت) قبل المضاعف؛ null عند الكبوت */
  compare: [number, number] | null;
  level: Level;
  success: boolean;
  kaboot: Team | null;
  projWinner: Team | null;
  projPts: number;
  /** الفريق الذي أخذ +2 البلوت فعلياً */
  balootTo: Team | null;
  reason: RoundReason;
}

export function scoreRoundPure(inp: RoundInput): RoundResult {
  const { type, buyer } = inp;
  const opp = (1 - buyer) as Team;
  if (inp.level < 1 || inp.level > RULES.maxLevel[type]) throw new Error(`مضاعف غير مسموح: ${type} ${inp.level}`);
  const k = inp.level;
  const total = RULES.total[type];
  const cap = k > 1 ? RULES.projectMultiplierCap : 1;

  const cardPts: [number, number] = [0, 0];
  if (type === 'hokm') {
    const counting: Team = countingIsBuyer(inp.level) ? buyer : opp;
    cardPts[counting] = hokmPoints(inp.abnat[counting]);
    cardPts[1 - counting] = total - cardPts[counting];
  } else {
    cardPts[0] = sunPoints(inp.abnat[0]);
    cardPts[1] = sunPoints(inp.abnat[1]);
    if (cardPts[0] + cardPts[1] !== total) throw new Error('مجموع نقاط الصن لا يساوي 26');
  }

  const cmp = compareProjects(inp.projects[0], inp.projects[1]);
  const projWinner = cmp.winner, projPts = cmp.pts;
  const baloot = type === 'hokm' ? inp.baloot : null;

  const kaboot: Team | null = inp.tricksWon[0] === 8 ? 0 : inp.tricksWon[1] === 8 ? 1 : null;
  if (kaboot !== null) {
    const pts: [number, number] = [0, 0];
    pts[kaboot] = RULES.kaboot[type] * k + (projWinner !== null ? projPts * cap : 0) + (baloot !== null ? RULES.baloot : 0);
    return { pts, cardPts, compare: null, level: inp.level, success: kaboot === buyer, kaboot, projWinner, projPts, balootTo: baloot !== null ? kaboot : null, reason: 'kaboot' };
  }

  const gp: [number, number] = [
    cardPts[0] + (projWinner === 0 ? projPts : 0) + (baloot === 0 ? RULES.baloot : 0),
    cardPts[1] + (projWinner === 1 ? projPts : 0) + (baloot === 1 ? RULES.baloot : 0),
  ];
  const success = gp[buyer] > gp[opp]; // التعادل = فشل المشتري
  const pts: [number, number] = [0, 0];
  let balootTo: Team | null = null;
  if (success) {
    for (const t of [0, 1] as Team[]) pts[t] = cardPts[t] * k + (projWinner === t ? projPts * cap : 0) + (baloot === t ? RULES.baloot : 0);
    balootTo = baloot;
  } else {
    pts[opp] = total * k + (projWinner !== null ? projPts * cap : 0) + (baloot !== null ? RULES.baloot : 0);
    balootTo = baloot !== null ? opp : null;
  }
  return { pts, cardPts, compare: gp, level: inp.level, success, kaboot: null, projWinner, projPts, balootTo, reason: success ? 'normal' : 'buyer_failed' };
}

// ---------- نهاية المباراة ----------

export interface MatchState { over: boolean; winTeam: Team | null; tied: boolean }
/** فريق واحد ≥152 يفوز؛ الاثنان ≥152 فالأعلى يفوز؛ التساوي التام ≥152 = جولة فاصلة (النقاط محفوظة) */
export function matchState(scores: [number, number]): MatchState {
  const T = RULES.target;
  if (scores[0] < T && scores[1] < T) return { over: false, winTeam: null, tied: false };
  if (scores[0] === scores[1]) return { over: false, winTeam: null, tied: true };
  return { over: true, winTeam: scores[0] > scores[1] ? 0 : 1, tied: false };
}
