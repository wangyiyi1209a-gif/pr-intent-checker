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

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "when",
  "into",
  "your",
  "have",
  "has",
  "was",
  "were",
  "are",
  "been",
  "being",
  "will",
  "can",
  "could",
  "should",
  "would",
  "instead",
  "locally",
  "tested",
  "test",
  "return",
  "returns",
  "using",
  "used",
  "use",
  "only",
  "just",
  "also",
  "than",
  "then",
  "them",
  "they",
  "their",
  "about",
  "after",
  "before",
  "over",
  "under",
  "fix",
  "fixed",
  "fixes",
  "feat",
  "chore",
  "docs",
  "refactor",
]);

/** 从 unified diff 里抽出文件路径（Demo 往往不传 files 列表） */
function extractFilesFromDiff(diff: string): string[] {
  const names = new Set<string>();
  for (const line of diff.split("\n")) {
    const m1 = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (m1) {
      names.add(m1[2]);
      continue;
    }
    const m2 = line.match(/^\+\+\+ b\/(.+)$/);
    if (m2 && m2[1] !== "/dev/null") names.add(m2[1]);
  }
  return [...names];
}

function tokenizeMeaningful(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_\u4e00-\u9fff]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function pathTokens(fileNames: string[]): string[] {
  const out: string[] = [];
  for (const name of fileNames) {
    out.push(
      ...name
        .toLowerCase()
        .split(/[\\/._-]+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
    );
  }
  return out;
}

/**
 * 无 LLM 时的启发式分析：保证本地不开 API Key 也能跑通全流程。
 * 重点抓「范围漂移」（如声称修 README，却改了 auth），而不是逐词硬匹配英文口语。
 */
export function heuristicAnalyze(input: AnalyzeInput): AnalyzeResult {
  const title = (input.title || "").trim();
  const body = (input.body || "").trim();
  const commits = input.commitMessages || [];
  const files = input.files || [];
  let fileNames = files.map((f) => f.filename).filter(Boolean);
  if (!fileNames.length) {
    fileNames = extractFilesFromDiff(input.diff);
  }

  const statedParts = [title, body].filter(Boolean);
  const statedIntent = statedParts.length
    ? `${statedParts.join(" | ").slice(0, 400)}${
        commits.length ? ` （另有 commit: ${commits.slice(0, 3).join(" / ")}）` : ""
      }`
    : commits.length
      ? `作者未写 PR 描述；commit: ${commits.slice(0, 3).join(" / ")}`
      : "作者未提供清晰的 PR 描述或提交说明";

  const additions = files.reduce((s, f) => s + (f.additions || 0), 0);
  const deletions = files.reduce((s, f) => s + (f.deletions || 0), 0);
  const actualChanges = fileNames.length
    ? `共改动 ${fileNames.length} 个文件${files.length ? ` (+${additions}/-${deletions})` : ""}：${fileNames.slice(0, 12).join(", ")}${fileNames.length > 12 ? " ..." : ""}`
    : `根据 diff 文本长度约 ${input.diff.length} 字符判断存在代码改动`;

  const drifts: AnalyzeResult["drifts"] = [];
  const matchedPoints: string[] = [];
  const recommendations: string[] = [];

  const unclear = !title && !body;
  let score = 88;

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

  const intentText = `${title} ${body}`.toLowerCase();
  const intentTokens = tokenizeMeaningful(`${title} ${body}`);
  const fileToks = pathTokens(fileNames);
  const haystack = `${input.diff}\n${fileNames.join("\n")}`.toLowerCase();

  // 过于泛化的 UI 词不作为强重合（避免 form/button 误抬分）
  const weakHitTokens = new Set([
    "form",
    "button",
    "page",
    "list",
    "search",
    "ui",
    "css",
    "style",
    "view",
    "index",
    "file",
    "code",
  ]);
  const pathHits = intentTokens.filter(
    (t) =>
      !weakHitTokens.has(t) && (fileToks.includes(t) || haystack.includes(t)),
  );
  if (intentTokens.length > 0) {
    const ratio = pathHits.length / intentTokens.length;
    if (ratio >= 0.25 || pathHits.length >= 2) {
      matchedPoints.push(
        `意图用语与文件/代码标识有重合：${[...new Set(pathHits)].slice(0, 6).join(", ")}`,
      );
      score = Math.max(score, 86);
    }
  }

  // 声称只做 docs/typo，却改了业务代码 → 强漂移信号
  const claimsDocsOnly =
    /\b(readme|typo|spelling|docs?|documentation|错别字|文档)\b/i.test(intentText) &&
    !/\b(auth|session|login|api|security|dependenc|refactor|feature)\b/i.test(intentText);

  // 声称「小改/微调/只改间距/单页」，实际多文件或结构性改动 → 范围漂移
  const claimsMinorScope =
    /\b(minor|tweak|spacing|one list page|single page|only one|小改|微调|间距|一行|一点点)\b/i.test(
      intentText,
    ) && !/\b(refactor|migrate|upgrade|多页|重构|迁移|升级)\b/i.test(intentText);

  const codeLikeFiles = fileNames.filter(
    (f) =>
      /\.(vue|tsx?|jsx?|java|go|py|rb|php)$/i.test(f) ||
      /(^|\/)src\//i.test(f),
  );
  // docs/examples 下的 .vue 沙盒也算「示例代码改动」
  const exampleCodeFiles = fileNames.filter((f) =>
    /examples\/.*\.(vue|tsx?|jsx?)$/i.test(f),
  );
  const structuralSignal =
    /\bv-model\b|:data\.sync|queryForm\.condition|BaseForm|gd-search-form|migrate|refactor/i.test(
      input.diff,
    );
  const multiFileStructural =
    codeLikeFiles.length + exampleCodeFiles.length >= 2 ||
    (fileNames.length >= 3 && structuralSignal) ||
    additions + (input.diff.match(/^\+/gm)?.length || 0) > 80;

  const touchesCode = fileNames.some(
    (f) =>
      !/\.(md|txt|rst)$/i.test(f) &&
      !/(^|\/)docs?\//i.test(f) &&
      !/readme/i.test(f),
  );
  const touchesSensitive = fileNames.some((f) =>
    /(auth|session|login|security|password|jwt|oauth)/i.test(f),
  );
  const touchesDeps = fileNames.some((f) =>
    /(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)/i.test(f),
  );

  if (claimsDocsOnly && (touchesCode || touchesDeps || exampleCodeFiles.length)) {
    drifts.push({
      title: "声称文档/错别字修复，却改动了代码或依赖",
      reason: `描述偏向文档修改，但实际涉及：${fileNames.join(", ")}`,
      files: fileNames,
      severity: touchesSensitive ? "high" : "medium",
    });
    score = Math.min(score, touchesSensitive ? 38 : 52);
  }

  if (claimsMinorScope && multiFileStructural) {
    drifts.push({
      title: "声称小范围 UI/间距调整，实际为多文件结构性改动",
      reason: `描述像「小改」，但 diff 涉及 ${fileNames.length} 个文件（含 ${[...new Set([...codeLikeFiles, ...exampleCodeFiles])].length} 个组件/示例代码），更像列表升级/重构。`,
      files: fileNames.slice(0, 8),
      severity: "high",
    });
    score = Math.min(score, 42);
  }

  if (touchesSensitive && !/\b(auth|session|login|security|jwt|token)\b/i.test(intentText)) {
    drifts.push({
      title: "未说明的鉴权/会话相关改动",
      reason: "diff 触及 auth/session 等敏感路径，但 PR 描述未提及。",
      files: fileNames.filter((f) => /(auth|session|login|security)/i.test(f)),
      severity: "high",
    });
    score = Math.min(score, 45);
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

  const noisy = fileNames.filter((f) =>
    /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.map$)/i.test(f),
  );
  if (noisy.length && !/lock|deps|dependenc/i.test(intentText)) {
    drifts.push({
      title: "可能存在未说明的依赖/产物改动",
      reason: `检测到 ${noisy.join(", ")}，但描述未提及依赖或锁文件更新。`,
      files: noisy,
      severity: "low",
    });
    score = Math.min(score, score > 70 ? 72 : score);
  }

  // 单文件、意图与路径重合较好 → 抬到 aligned
  if (!unclear && drifts.every((d) => d.severity === "low") && fileNames.length <= 3 && pathHits.length >= 1) {
    score = Math.max(score, 90);
  }
  if (!unclear && drifts.length === 0 && fileNames.length > 0) {
    score = Math.max(score, 88);
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
        ? "启发式判断：PR 意图与改动大体一致（当前未启用 LLM）。"
        : level === "unclear"
          ? "启发式判断：意图不清晰，建议先补描述再审查。"
          : "启发式判断：可能存在意图漂移，建议人工核对高亮项。",
    statedIntent,
    actualChanges,
    matchedPoints,
    drifts: drifts.filter((d) => !(level === "aligned" && d.severity === "low")),
    recommendations,
    model: "heuristic-v2",
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
