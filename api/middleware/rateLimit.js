// Simple in-memory rate limiter
// Limit: 15 requests per minute per IP

const store = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 15;

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  const now = Date.now();
  let entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    store.set(ip, entry);
  }

  entry.count++;

  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetTime = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetTime);

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: `Too many requests. Please wait ${resetTime} seconds before trying again.`,
      retryAfter: resetTime,
    });
    return false; // blocked
  }

  return true; // allowed
}
