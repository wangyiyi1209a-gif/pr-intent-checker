import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/** 健康检查：部署后可用 curl /api/health 验证服务是否活着 */
export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    ok: true,
    service: "pr-intent-checker",
    time: new Date().toISOString(),
    githubAppConfigured: config.hasGitHubApp,
    llmConfigured: config.hasLlm,
  });
}
