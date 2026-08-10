import { heuristicAnalyze } from "../src/lib/analyze";

const aligned = heuristicAnalyze({
  title: "fix: prevent null crash in user profile API",
  body: "When profile is missing, the handler threw. Return 404 instead.\n\nTested with curl locally.",
  diff: `diff --git a/src/api/profile.ts b/src/api/profile.ts
+++ b/src/api/profile.ts
+  if (!user?.profile) {
+    throw new HttpError(404, "profile not found");
`,
  files: [{ filename: "src/api/profile.ts", additions: 5, deletions: 1 }],
});

const drift = heuristicAnalyze({
  title: "fix: typo in README",
  body: "Fixed a spelling mistake.",
  diff: "diff --git a/README.md b/README.md\ndiff --git a/src/auth/session.ts b/src/auth/session.ts",
  files: [
    { filename: "README.md" },
    { filename: "src/auth/session.ts" },
    { filename: "package.json" },
  ],
});

console.log("ALIGNED", aligned.consistencyScore, aligned.level, aligned.drifts.length);
console.log("DRIFT", drift.consistencyScore, drift.level, drift.drifts.map((d) => d.title));
