/**
 * Token bucket. Refills continuously; consume() returns false when the
 * client is over budget. Every client-triggered action goes through one
 * of these — a client can never make the server do unbounded work.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly ratePerSec: number,
    private readonly burst: number,
  ) {
    this.tokens = burst;
    this.lastRefill = performance.now();
  }

  consume(cost = 1): boolean {
    const now = performance.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.ratePerSec);
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}
