/** دلو رموز بسيط: burst أولي، ويتعبّى بمعدل ثابت */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private capacity: number,
    private perSecond: number,
    private now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = now();
  }
  take(): boolean {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.perSecond);
    this.last = t;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/** محدد معدل لكل مفتاح (مثل IP) */
export class KeyedLimiter {
  private buckets = new Map<string, TokenBucket>();
  constructor(
    private capacity: number,
    private perSecond: number,
    private now: () => number = Date.now,
  ) {}
  allow(key: string): boolean {
    let b = this.buckets.get(key);
    if (!b) {
      if (this.buckets.size > 10_000) this.buckets.clear();
      b = new TokenBucket(this.capacity, this.perSecond, this.now);
      this.buckets.set(key, b);
    }
    return b.take();
  }
}
