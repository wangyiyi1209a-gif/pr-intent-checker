import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verify } from "@octokit/webhooks-methods";
import { getConfig } from "@/lib/config";
import { analyzePullRequest } from "@/lib/analyze";
import { createInstallationOctokit, fetchPrContext } from "@/lib/github";
import { formatPrComment, upsertPrComment } from "@/lib/comment";
import { saveAnalysis } from "@/lib/store";
import type { IntentAnalysis } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GitHub App Webhook 入口。
 * 在 GitHub App 设置里把 Webhook URL 指到：
 *   https://你的域名/api/webhook/github
 *
 * 订阅事件建议：Pull request
 * 我们处理：opened / reopened / synchronize / edited / ready_for_review
 */
export async function POST(req: NextRequest) {
  const config = getConfig();
  const signature = req.headers.get("x-hub-signature-256") || "";
  const eventName = req.headers.get("x-github-event") || "";
  const delivery = req.headers.get("x-github-delivery") || "";
  const rawBody = await req.text();

  if (!config.webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_WEBHOOK_SECRET 未配置" },
      { status: 500 },
    );
  }

  const valid = await verify(config.webhookSecret, rawBody, signature);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  // GitHub 连通性探测
  if (eventName === "ping") {
    return NextResponse.json({ ok: true, message: "pong", delivery });
  }

  if (eventName !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: eventName });
  }

  const payload = JSON.parse(rawBody) as {
    action?: string;
    installation?: { id: number };
    repository?: { name: string; owner: { login: string }; full_name: string };
    pull_request?: { number: number; draft?: boolean };
  };

  const action = payload.action || "";
  const allowed = new Set([
    "opened",
    "reopened",
    "synchronize",
    "edited",
    "ready_for_review",
  ]);

  if (!allowed.has(action)) {
    return NextResponse.json({ ok: true, ignoredAction: action });
  }

  if (payload.pull_request?.draft) {
    return NextResponse.json({ ok: true, ignored: "draft" });
  }

  const installationId = payload.installation?.id;
  const owner = payload.repository?.owner.login;
  const repo = payload.repository?.name;
  const number = payload.pull_request?.number;

  if (!installationId || !owner || !repo || !number) {
    return NextResponse.json({ ok: false, error: "incomplete payload" }, { status: 400 });
  }

  try {
    const octokit = createInstallationOctokit(installationId);
    const ctx = await fetchPrContext(octokit, owner, repo, number);
    const result = await analyzePullRequest({
      title: ctx.title,
      body: ctx.body,
      commitMessages: ctx.commitMessages,
      diff: ctx.diff,
      files: ctx.files,
      source: "webhook",
      repo: `${owner}/${repo}`,
      prNumber: number,
      prUrl: ctx.htmlUrl,
    });

    const analysis: IntentAnalysis = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      source: "webhook",
      repo: `${owner}/${repo}`,
      prNumber: number,
      prUrl: ctx.htmlUrl,
      title: ctx.title,
      body: ctx.body,
      ...result,
      rawDiffStats: {
        filesChanged: ctx.files.length,
        additions: ctx.files.reduce((s, f) => s + (f.additions || 0), 0),
        deletions: ctx.files.reduce((s, f) => s + (f.deletions || 0), 0),
      },
    };

    saveAnalysis(analysis);

    const comment = formatPrComment(analysis, config.publicUrl);
    await upsertPrComment(octokit, owner, repo, number, comment);

    return NextResponse.json({
      ok: true,
      delivery,
      analysisId: analysis.id,
      score: analysis.consistencyScore,
      level: analysis.level,
    });
  } catch (error) {
    console.error("[webhook] failed:", error);
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
