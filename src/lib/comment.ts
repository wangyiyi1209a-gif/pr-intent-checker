import type { Octokit } from "@octokit/rest";
import type { IntentAnalysis } from "./types";

const MARKER = "<!-- pr-intent-checker -->";

function levelEmoji(level: IntentAnalysis["level"]): string {
  switch (level) {
    case "aligned":
      return "✅";
    case "minor_drift":
      return "⚠️";
    case "major_drift":
      return "🚨";
    default:
      return "❓";
  }
}

/**
 * 把分析结果格式化成 GitHub PR 评论（Markdown）。
 */
export function formatPrComment(analysis: IntentAnalysis, appUrl: string): string {
  const drifts =
    analysis.drifts.length === 0
      ? "_未发现明显漂移项_"
      : analysis.drifts
          .map((d) => {
            const files = d.files?.length ? `（文件：${d.files.join(", ")}）` : "";
            return `- **[${d.severity}] ${d.title}**：${d.reason}${files}`;
          })
          .join("\n");

  const matched = analysis.matchedPoints.map((x) => `- ${x}`).join("\n") || "- （无）";
  const recs = analysis.recommendations.map((x) => `- ${x}`).join("\n") || "- （无）";

  return `${MARKER}
## ${levelEmoji(analysis.level)} PR Intent Consistency Report

| 项目 | 结果 |
| --- | --- |
| Consistency Score | **${analysis.consistencyScore}/100** |
| Level | \`${analysis.level}\` |
| Model | \`${analysis.model}\` |

### Summary
${analysis.summary}

### Stated Intent
${analysis.statedIntent}

### Actual Changes
${analysis.actualChanges}

### Matched
${matched}

### Drift Findings
${drifts}

### Recommendations
${recs}

---
_Automated by [PR Intent Checker](${appUrl}) · id \`${analysis.id}\`_
`;
}

/**
 * 若已有本 bot 评论则更新，否则新建 —— 避免 PR 被刷屏。
 */
export async function upsertPrComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const comments = await octokit.paginate(octokit.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) {
    await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return;
  }

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}
