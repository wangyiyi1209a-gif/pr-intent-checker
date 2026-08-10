/**
 * 命令行快速自测（不启动网页）：
 *   npx tsx scripts/simulate-pr.ts
 *
 * 作用：模拟一条「标题说修 README、diff 却改了 auth」的 PR，
 * 调用与线上相同的 analyzePullRequest，打印分数。
 */
import { analyzePullRequest } from "../src/lib/analyze";

async function main() {
  const result = await analyzePullRequest({
    title: "fix: typo in README",
    body: "Fixed a spelling mistake.",
    commitMessages: ["fix typo"],
    diff: `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-# Appilcation
+# Application
diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,20 @@
-export const secret = "dev";
+import crypto from "crypto";
+export function rotateSecret() {
+  return crypto.randomBytes(32).toString("hex");
+}
`,
    files: [
      { filename: "README.md", status: "modified", additions: 1, deletions: 1 },
      { filename: "src/auth.ts", status: "modified", additions: 15, deletions: 1 },
    ],
    source: "manual",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
