/**
 * Phone number caching system for performance optimization
 * Prevents repeated API calls for the same assistant's phone number
 */

interface CachedPhone {
  phoneNumber: string;
  formattedNumber: string;
  timestamp: number;
  assistantId: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const phoneCache = new Map<string, CachedPhone>();

/**
 * Get cached phone number for assistant
 */
export const getCachedPhone = (assistantId: string): CachedPhone | null => {
  const cached = phoneCache.get(assistantId);
  
  if (!cached) return null;
  
  // Check if cache is still valid
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  
  if (isExpired) {
    phoneCache.delete(assistantId);
    return null;
  }
  
  return cached;
};

/**
 * Cache phone number for assistant
 */
export const setCachedPhone = (
  assistantId: string, 
  phoneNumber: string, 
  formattedNumber: string
): void => {
  phoneCache.set(assistantId, {
    phoneNumber,
    formattedNumber,
    timestamp: Date.now(),
    assistantId
  });
};

/**
 * Clear cache for specific assistant or all
 */
export const clearPhoneCache = (assistantId?: string): void => {
  if (assistantId) {
    phoneCache.delete(assistantId);
  } else {
    phoneCache.clear();
  }
};

/**
 * Get cache stats for monitoring
 */
export const getPhoneCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(phoneCache.values());
  
  return {
    totalEntries: entries.length,
    activeEntries: entries.filter(e => now - e.timestamp < CACHE_DURATION).length,
    expiredEntries: entries.filter(e => now - e.timestamp >= CACHE_DURATION).length,
    cacheSize: phoneCache.size
  };
};

/**
 * Cleanup expired cache entries (run periodically)
 */
export const cleanupExpiredCache = (): number => {
  const now = Date.now();
  let removed = 0;
  
  for (const [key, value] of phoneCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      phoneCache.delete(key);
      removed++;
    }
  }
  
  return removed;
};

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const removed = cleanupExpiredCache();
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired phone cache entries`);
    }
  }, CACHE_DURATION);
}
