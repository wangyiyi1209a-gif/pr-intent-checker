import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { analyzePullRequest } from "@/lib/analyze";
import { saveAnalysis } from "@/lib/store";
import type { IntentAnalysis } from "@/lib/types";

const BodySchema = z.object({
  title: z.string().default(""),
  body: z.string().optional(),
  commitMessages: z.array(z.string()).optional(),
  diff: z.string().min(1, "diff 不能为空"),
  files: z
    .array(
      z.object({
        filename: z.string(),
        status: z.string().optional(),
        additions: z.number().optional(),
        deletions: z.number().optional(),
        patch: z.string().optional(),
      }),
    )
    .optional(),
  source: z.enum(["demo", "manual", "webhook"]).optional(),
});

/**
 * POST /api/analyze
 * 手动/Demo 分析入口：不依赖 GitHub Webhook，方便本地先跑通。
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = BodySchema.parse(json);
    const result = await analyzePullRequest({
      title: input.title,
      body: input.body,
      commitMessages: input.commitMessages,
      diff: input.diff,
      files: input.files,
      source: input.source || "manual",
    });

    const analysis: IntentAnalysis = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      source: input.source || "manual",
      title: input.title,
      body: input.body || "",
      ...result,
      rawDiffStats: {
        filesChanged: input.files?.length || 0,
        additions: input.files?.reduce((s, f) => s + (f.additions || 0), 0) || 0,
        deletions: input.files?.reduce((s, f) => s + (f.deletions || 0), 0) || 0,
      },
    };

    saveAnalysis(analysis);
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
