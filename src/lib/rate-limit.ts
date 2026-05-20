const loginAttempts = new Map<string, { count: number; blockUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 60 * 1000; // 1 minute to count attempts

// Helper to check if Vercel KV or Upstash Redis is configured
function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// REST-based Upstash Redis pipeline to avoid external package dependencies
async function kvRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const url = `${process.env.KV_REST_API_URL}/pipeline`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["TTL", key],
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`KV REST Error: ${res.statusText}`);
    }

    const data = await res.json();
    // pipeline returns array of command results: [{result: count}, {result: ttl}]
    const count = data[0]?.result ?? 1;
    let ttl = data[1]?.result ?? windowSeconds;

    if (count === 1) {
      // Set expiration on first increment
      await fetch(`${process.env.KV_REST_API_URL}/EXPIRE/${key}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        cache: "no-store",
      });
      ttl = windowSeconds;
    }

    const remaining = Math.max(0, limit - count);

    if (count > limit) {
      return { allowed: false, remaining, retryAfter: ttl > 0 ? ttl : windowSeconds };
    }

    return { allowed: true, remaining };
  } catch (error) {
    console.error("[Rate Limit KV Fallback Error]:", error);
    // Fallback gracefully to allow request if KV is down
    return { allowed: true, remaining: 1 };
  }
}

export async function checkLoginRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const cleanKey = `rate_login:${identifier.replace(/[^a-zA-Z0-9@._-]/g, "_")}`;

  if (isKVConfigured()) {
    const result = await kvRateLimit(cleanKey, MAX_ATTEMPTS, 60);
    if (!result.allowed) {
      return { allowed: false, retryAfter: result.retryAfter ?? 60 };
    }
    return { allowed: true };
  }

  // Fallback to in-memory
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (entry && entry.blockUntil > now) {
    const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  if (!entry || now - WINDOW_MS > entry.blockUntil) { // reset if window passed
    loginAttempts.set(identifier, { count: 1, blockUntil: now + WINDOW_MS });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    entry.blockUntil = now + BLOCK_DURATION_MS;
    return { allowed: false, retryAfter: BLOCK_DURATION_MS / 1000 };
  }

  return { allowed: true };
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const cleanKey = `rate_limit:${key.replace(/[^a-zA-Z0-9:._-]/g, "_")}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  if (isKVConfigured()) {
    const result = await kvRateLimit(cleanKey, maxRequests, windowSeconds);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetIn: (result.retryAfter ?? windowSeconds) * 1000,
    };
  }

  // Fallback to in-memory
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining, resetIn: entry.resetTime - now };
}
