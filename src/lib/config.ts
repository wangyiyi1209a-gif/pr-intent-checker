/**
 * 读取环境变量。本地开发：复制 .env.example → .env.local
 * 上线：在 Railway / Fly / Vercel 控制台配置同样的变量。
 */
export function getConfig() {
  const appId = process.env.GITHUB_APP_ID || "";
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n",
  );
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";
  const openaiApiKey = process.env.OPENAI_API_KEY || "";
  const openaiBaseUrl = process.env.OPENAI_BASE_URL || undefined;
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const appSlug = process.env.GITHUB_APP_SLUG || "pr-intent-checker";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    appId,
    privateKey,
    webhookSecret,
    openaiApiKey,
    openaiBaseUrl,
    openaiModel,
    appSlug,
    publicUrl,
    hasGitHubApp: Boolean(appId && privateKey && webhookSecret),
    hasLlm: Boolean(openaiApiKey),
  };
}

export type AppConfig = ReturnType<typeof getConfig>;
