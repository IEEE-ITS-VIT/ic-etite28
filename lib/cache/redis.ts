import "server-only";

// Universal Redis & In-Memory Cache Client for Next.js Serverless
// Compatible with Upstash Redis (Vercel Marketplace) or fallback in-memory TTL cache.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRedisConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

/**
 * Retrieves a value from Redis (or memory cache fallback).
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (isRedisConfigured()) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { result: string | null };
      if (!data.result) return null;
      try {
        return JSON.parse(data.result) as T;
      } catch {
        return data.result as unknown as T;
      }
    } catch {
      // Fall through to memory cache if Redis times out
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Stores a value in Redis with TTL in seconds.
 */
export async function setCache<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  const serialized = JSON.stringify(value);

  if (isRedisConfigured()) {
    try {
      await fetch(
        `${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}?ex=${ttlSeconds}`,
        {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        }
      );
    } catch {}
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Evicts a key from Redis and local memory.
 */
export async function deleteCache(key: string): Promise<void> {
  memoryCache.delete(key);

  if (isRedisConfigured()) {
    try {
      await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
    } catch {}
  }
}

/**
 * Helper to wrap any expensive database fetch with transparent Redis caching.
 */
export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
  const hit = await getCache<T>(key);
  if (hit !== null && hit !== undefined) return hit;

  const fresh = await fetcher();
  void setCache(key, fresh, ttlSeconds).catch(() => {});
  return fresh;
}
