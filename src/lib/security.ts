/**
 * 生产环境用的轻量防护：请求体大小限制 + 简易内存限流。
 * 单实例 Docker/VPS 足够；多实例时请换成 Redis。
 */

const hits = new Map<string, { count: number; resetAt: number }>();

export function assertDiffSize(diff: string, maxChars = 200_000) {
  if (diff.length > maxChars) {
    throw new Error(`diff 过长（${diff.length} > ${maxChars}），请缩小范围或拆分 PR`);
  }
}

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
  }
  cur.count += 1;
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
