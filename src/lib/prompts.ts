export const SYSTEM_PROMPT = `You are a senior code reviewer specialized in detecting "intent drift" in pull requests.

Intent drift means: the PR title/description/commit messages claim one thing, but the code diff does something else (extra refactors, unrelated files, missing promised changes, or contradictory behavior).

Rules:
- Be concrete. Cite file paths and change themes.
- Do NOT invent files that are not in the diff.
- If the description is empty/vague, level should usually be "unclear" and score <= 55.
- Score meaning:
  - 85-100: aligned
  - 65-84: minor_drift
  - 0-64: major_drift (or unclear if intent cannot be determined)
- Output MUST be valid JSON matching the schema. No markdown fences.`;

export function buildUserPrompt(input: {
  title: string;
  body: string;
  commitMessages: string[];
  diff: string;
  fileSummary: string;
}): string {
  return `Analyze this pull request for intent consistency.

## PR Title
${input.title || "(empty)"}

## PR Description
${input.body || "(empty)"}

## Commit Messages
${input.commitMessages.length ? input.commitMessages.map((m) => `- ${m}`).join("\n") : "(none)"}

## Changed Files Summary
${input.fileSummary || "(none)"}

## Diff (may be truncated)
\`\`\`diff
${input.diff}
\`\`\`

Return JSON with this exact shape:
{
  "consistencyScore": number,
  "level": "aligned" | "minor_drift" | "major_drift" | "unclear",
  "summary": string,
  "statedIntent": string,
  "actualChanges": string,
  "matchedPoints": string[],
  "drifts": [{"title": string, "reason": string, "files": string[], "severity": "low"|"medium"|"high"}],
  "recommendations": string[]
}`;
}
