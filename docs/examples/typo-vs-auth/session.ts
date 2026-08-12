/**
 * 脱敏示例：模拟「标题写修 typo，实际改登录会话」的漂移场景。
 * 非公司真实代码。
 */
export async function createSession(userId: string) {
  const token = Buffer.from(`${userId}:${Date.now()}`).toString("base64");
  // pretend redis: await redis.set(`sess:${userId}`, token, "EX", 604800);
  return { token, exp: Date.now() + 7 * 24 * 3600 * 1000 };
}

export async function revokeSession(userId: string) {
  // pretend redis: await redis.del(`sess:${userId}`);
  return { ok: true, userId };
}

/** 故意多出来的鉴权改动：标题没提，但代码加了 */
export async function requireAuth(header?: string) {
  if (!header?.startsWith("Bearer ")) {
    throw new Error("unauthorized");
  }
  return header.slice("Bearer ".length);
}
