import OpenAI from "openai";
import { z } from "zod";
import { getConfig } from "./config";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { AnalyzeInput, AnalyzeResult, DriftLevel } from "./types";

const ResultSchema = z.object({
  consistencyScore: z.number().min(0).max(100),
  level: z.enum(["aligned", "minor_drift", "major_drift", "unclear"]),
  summary: z.string(),
  statedIntent: z.string(),
  actualChanges: z.string(),
  matchedPoints: z.array(z.string()),
  drifts: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      files: z.array(z.string()).optional(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  recommendations: z.array(z.string()),
});

const MAX_DIFF_CHARS = 24000;

function truncate(text: string, max = MAX_DIFF_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n...[diff truncated for analysis]...`;
}

function scoreToLevel(score: number, unclear: boolean): DriftLevel {
  if (unclear) return "unclear";
  if (score >= 85) return "aligned";
  if (score >= 65) return "minor_drift";
  return "major_drift";
}

/**
 * 无 LLM 时的启发式分析：保证本地不开 API Key 也能跑通全流程。
 * 逻辑简单但对「空描述 / 改动面过大」这类明显漂移仍然有用。
 */
export function heuristicAnalyze(input: AnalyzeInput): AnalyzeResult {
  const title = (input.title || "").trim();
  const body = (input.body || "").trim();
  const commits = input.commitMessages || [];
  const files = input.files || [];
  const fileNames = files.map((f) => f.filename);

  const statedParts = [title, body, ...commits].filter(Boolean);
  const statedIntent = statedParts.length
    ? statedParts.join(" | ").slice(0, 400)
    : "作者未提供清晰的 PR 描述或提交说明";

  const additions = files.reduce((s, f) => s + (f.additions || 0), 0);
  const deletions = files.reduce((s, f) => s + (f.deletions || 0), 0);
  const actualChanges = fileNames.length
    ? `共改动 ${fileNames.length} 个文件 (+${additions}/-${deletions})：${fileNames.slice(0, 12).join(", ")}${fileNames.length > 12 ? " ..." : ""}`
    : `根据 diff 文本长度约 ${input.diff.length} 字符判断存在代码改动`;

  const drifts: AnalyzeResult["drifts"] = [];
  const matchedPoints: string[] = [];
  const recommendations: string[] = [];

  const unclear = !title && !body;
  let score = 78;

  if (unclear) {
    score = 40;
    drifts.push({
      title: "缺少意图说明",
      reason: "PR 标题与描述为空，审查者无法核对「声称要做的事」与 diff 是否一致。",
      severity: "high",
    });
    recommendations.push("补充 PR 描述：动机、改动范围、测试方式、非目标（Out of scope）。");
  } else {
    matchedPoints.push("存在可读的标题/描述，可作为意图基线。");
  }

  // 标题关键词是否在文件名/diff 中出现（粗匹配）
  const tokens = `${title} ${body}`
    .toLowerCase()
    .split(/[^a-z0-9_\u4e00-\u9fff]+/)
    .filter((t) => t.length >= 3)
    .slice(0, 20);
  const haystack = `${input.diff}\n${fileNames.join("\n")}`.toLowerCase();
  const hit = tokens.filter((t) => haystack.includes(t));
  const miss = tokens.filter((t) => !haystack.includes(t));

  if (tokens.length >= 3) {
    const ratio = hit.length / tokens.length;
    score = Math.round(score * 0.4 + ratio * 100 * 0.6);
    if (ratio >= 0.5) {
      matchedPoints.push(`描述中的关键用语与 diff/文件有一定重合（命中 ${hit.length}/${tokens.length}）。`);
    }
    if (miss.length && ratio < 0.45) {
      drifts.push({
        title: "描述关键词与代码关联弱",
        reason: `以下描述用语在 diff/文件名中较少出现：${miss.slice(0, 8).join(", ")}`,
        severity: "medium",
      });
      score = Math.min(score, 62);
    }
  }

  if (fileNames.length >= 15) {
    drifts.push({
      title: "改动文件过多",
      reason: `一次 PR 改动了 ${fileNames.length} 个文件，若描述未解释广覆盖原因，审查风险升高。`,
      files: fileNames.slice(0, 8),
      severity: "medium",
    });
    score = Math.min(score, 70);
    recommendations.push("考虑拆分为多个 PR，或在描述中按模块说明为何必须同批改动。");
  }

  // lockfile / 格式化噪音
  const noisy = fileNames.filter((f) =>
    /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.map$)/i.test(f),
  );
  if (noisy.length && fileNames.length <= 3 && !/lock|deps|dependenc/i.test(`${title} ${body}`)) {
    drifts.push({
      title: "可能存在未说明的依赖/产物改动",
      reason: `检测到 ${noisy.join(", ")}，但描述未提及依赖或锁文件更新。`,
      files: noisy,
      severity: "low",
    });
    score = Math.min(score, 72);
  }

  if (!recommendations.length) {
    recommendations.push(
      score >= 85
        ? "意图与改动基本一致，可按常规流程审查。"
        : "请用 3-5 条 bullet 重写 PR 描述，明确「做了什么 / 没做什么 / 如何验证」。",
    );
  }

  score = Math.max(0, Math.min(100, score));
  const level = scoreToLevel(score, unclear);

  return {
    consistencyScore: score,
    level,
    summary:
      level === "aligned"
        ? "启发式判断：PR 意图与改动大体一致（未启用 LLM，结果偏保守）。"
        : level === "unclear"
          ? "启发式判断：意图不清晰，建议先补描述再审查。"
          : "启发式判断：可能存在意图漂移，建议人工核对高亮项。",
    statedIntent,
    actualChanges,
    matchedPoints,
    drifts,
    recommendations,
    model: "heuristic-v1",
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM 返回的内容不是合法 JSON");
  }
}

export async function analyzeWithLlm(input: AnalyzeInput): Promise<AnalyzeResult> {
  const config = getConfig();
  if (!config.openaiApiKey) {
    return heuristicAnalyze(input);
  }

  const fileSummary =
    input.files
      ?.map(
        (f) =>
          `- ${f.filename} (${f.status || "modified"}, +${f.additions ?? "?"}/-${f.deletions ?? "?"})`,
      )
      .join("\n") || "(no file list)";

  const client = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiBaseUrl,
  });

  const completion = await client.chat.completions.create({
    model: config.openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt({
          title: input.title,
          body: input.body || "",
          commitMessages: input.commitMessages || [],
          diff: truncate(input.diff),
          fileSummary,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  const parsed = ResultSchema.parse(extractJson(content));

  return {
    ...parsed,
    model: config.openaiModel,
  };
}

export async function analyzePullRequest(input: AnalyzeInput): Promise<AnalyzeResult> {
  try {
    return await analyzeWithLlm(input);
  } catch (error) {
    console.error("[analyze] LLM failed, fallback to heuristic:", error);
    const fallback = heuristicAnalyze(input);
    return {
      ...fallback,
      summary: `${fallback.summary}（LLM 调用失败，已自动降级）`,
      model: `${fallback.model}+fallback`,
    };
  }
}
