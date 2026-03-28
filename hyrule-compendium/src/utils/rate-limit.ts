// In-memory rate limiting map for serverless edge fallback. 
// Note: In a true Vercel environment, using Upstash Redis is recommended for distributed tracking.
// We use a Map here but remember state is lost between serverless cold starts.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true; // allowed
  }

  if (record.count >= limit) {
    return false; // rejected
  }

  record.count += 1;
  return true; // allowed
}
