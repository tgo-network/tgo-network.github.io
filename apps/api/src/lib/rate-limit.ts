interface RateLimitRule {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
}

interface BucketState {
  count: number;
  resetAtMs: number;
}

const bucketStore = new Map<string, BucketState>();

const now = () => Date.now();

const buildBucketKey = (rule: RateLimitRule) => `${rule.scope}:${rule.key}`;
const pruneExpiredBuckets = (currentTime: number) => {
  if (bucketStore.size < 5000) {
    return;
  }

  for (const [bucketKey, state] of bucketStore.entries()) {
    if (state.resetAtMs <= currentTime) {
      bucketStore.delete(bucketKey);
    }
  }
};

export const checkRateLimit = (rule: RateLimitRule): RateLimitDecision => {
  const currentTime = now();
  pruneExpiredBuckets(currentTime);
  const bucketKey = buildBucketKey(rule);
  const existing = bucketStore.get(bucketKey);

  if (!existing || existing.resetAtMs <= currentTime) {
    const resetAtMs = currentTime + rule.windowMs;
    bucketStore.set(bucketKey, {
      count: 1,
      resetAtMs
    });

    return {
      allowed: true,
      limit: rule.limit,
      remaining: Math.max(rule.limit - 1, 0),
      retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      resetAt: new Date(resetAtMs).toISOString()
    };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAtMs - currentTime) / 1000), 1),
      resetAt: new Date(existing.resetAtMs).toISOString()
    };
  }

  existing.count += 1;
  bucketStore.set(bucketKey, existing);

  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(rule.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAtMs - currentTime) / 1000), 1),
    resetAt: new Date(existing.resetAtMs).toISOString()
  };
};
