export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export type Rng = () => number;

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** الأعلى نقاطاً (مع التعادل). لو الكل صفر ما فيه فائز. */
export function topOf(scores: Record<string, number>): { winners: string[]; scores: Record<string, number> } {
  const max = Math.max(...Object.values(scores));
  return { winners: max > 0 ? Object.keys(scores).filter((k) => scores[k] === max) : [], scores };
}
