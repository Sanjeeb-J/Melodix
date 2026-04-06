// ─── Server-Side YouTube Search Cache ─────────────────────────────────────────
// Caches identical search queries for 30 minutes so repeated searches by any
// user don't burn YouTube Data API v3 quota (100 units per search call).

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 200;           // Max number of unique queries to cache

const cache = new Map();

/**
 * Returns cached results for a query, or null if not cached / expired.
 * @param {string} query
 * @returns {Array|null}
 */
const getCached = (query) => {
  const key = query.toLowerCase().trim();
  const entry = cache.get(key);
  if (!entry) return null;

  // Evict if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Stores search results in cache for a query.
 * @param {string} query
 * @param {Array} data
 */
const setCached = (query, data) => {
  const key = query.toLowerCase().trim();

  // Evict oldest entry if we're at capacity (simple FIFO eviction)
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Returns current cache stats (for debugging).
 */
const getCacheStats = () => ({
  size: cache.size,
  maxSize: MAX_CACHE_SIZE,
  ttlMinutes: CACHE_TTL_MS / 60000,
});

module.exports = { getCached, setCached, getCacheStats };
