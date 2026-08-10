import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/**
 * GET /api/status
 * 上线前自检：哪些配置齐了、还缺什么。不返回密钥内容。
 */
export async function GET() {
  const config = getConfig();

  const checks = [
    {
      id: "public_url",
      label: "公网地址 NEXT_PUBLIC_APP_URL",
      ok: Boolean(config.publicUrl) && !config.publicUrl.includes("localhost"),
      hint: config.publicUrl.includes("localhost")
        ? "仍是 localhost，上线后请改成 https://你的域名"
        : "已配置公网 URL",
    },
    {
      id: "github_app_id",
      label: "GITHUB_APP_ID",
      ok: Boolean(config.appId),
      hint: config.appId ? "已配置" : "去 GitHub App 设置页复制 App ID",
    },
    {
      id: "github_private_key",
      label: "GITHUB_APP_PRIVATE_KEY",
      ok: Boolean(config.privateKey.includes("BEGIN")),
      hint: config.privateKey.includes("BEGIN")
        ? "私钥格式看起来正常"
        : "需要粘贴完整 PEM（含 BEGIN/END，换行写成 \\n）",
    },
    {
      id: "webhook_secret",
      label: "GITHUB_WEBHOOK_SECRET",
      ok: Boolean(config.webhookSecret),
      hint: config.webhookSecret ? "已配置" : "与 GitHub App Webhook secret 保持一致",
    },
    {
      id: "llm",
      label: "OPENAI_API_KEY（可选）",
      ok: true,
      optional: true,
      hint: config.hasLlm
        ? `已启用 LLM（${config.openaiModel}）`
        : "未配置则使用启发式引擎，Demo 仍可上线",
    },
  ];

  const requiredOk = checks.filter((c) => !c.optional).every((c) => c.ok);
  const readyForWebhook = config.hasGitHubApp;
  const readyForDemo = true;

  return NextResponse.json({
    ok: true,
    readyForDemo,
    readyForWebhook,
    productionRecommended: requiredOk && readyForWebhook,
    publicUrl: config.publicUrl,
    webhookPath: "/api/webhook/github",
    webhookUrlExample: `${config.publicUrl.replace(/\/$/, "")}/api/webhook/github`,
    checks,
  });
}
