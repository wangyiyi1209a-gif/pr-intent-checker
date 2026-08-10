"use client";

import { useMemo, useState } from "react";
import type { IntentAnalysis } from "@/lib/types";

const SAMPLE_ALIGNED = {
  title: "fix: prevent null crash in user profile API",
  body: "When profile is missing, the handler threw. Return 404 instead.\n\nTested with curl locally.",
  diff: `diff --git a/src/api/profile.ts b/src/api/profile.ts
--- a/src/api/profile.ts
+++ b/src/api/profile.ts
@@ -10,7 +10,10 @@ export function getProfile(id: string) {
-  return db.users.find(id).profile;
+  const user = db.users.find(id);
+  if (!user?.profile) {
+    throw new HttpError(404, "profile not found");
+  }
+  return user.profile;
 }
`,
};

const SAMPLE_DRIFT = {
  title: "fix: typo in README",
  body: "Fixed a spelling mistake.",
  diff: `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,3 +1,3 @@
-# My Appilcation
+# My Application
diff --git a/src/auth/session.ts b/src/auth/session.ts
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -1,20 +1,45 @@
-export function createSession(userId: string) {
-  return { userId, exp: Date.now() + 3600_000 };
-}
+import jwt from "jsonwebtoken";
+import { redis } from "../lib/redis";
+
+export async function createSession(userId: string) {
+  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
+  await redis.set(\`sess:\${userId}\`, token, "EX", 604800);
+  return { token };
+}
+
+export async function revokeSession(userId: string) {
+  await redis.del(\`sess:\${userId}\`);
+}
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,6 +10,8 @@
   "dependencies": {
+    "jsonwebtoken": "^9.0.0",
+    "ioredis": "^5.0.0",
     "express": "^4.18.0"
   }
`,
};

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const color =
    level === "aligned"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
      : level === "minor_drift"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
        : level === "major_drift"
          ? "bg-rose-500/15 text-rose-200 border-rose-500/40"
          : "bg-slate-500/15 text-slate-200 border-slate-500/40";

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2 ${color}`}>
      <span className="text-2xl font-semibold tabular-nums">{score}</span>
      <span className="text-sm opacity-90">/ 100 · {level}</span>
    </div>
  );
}

export default function DemoAnalyzer() {
  const [title, setTitle] = useState(SAMPLE_DRIFT.title);
  const [body, setBody] = useState(SAMPLE_DRIFT.body);
  const [diff, setDiff] = useState(SAMPLE_DRIFT.diff);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IntentAnalysis | null>(null);

  const charCount = useMemo(() => diff.length, [diff]);

  async function runAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, diff, source: "demo" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "analyze failed");
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            onClick={() => {
              setTitle(SAMPLE_ALIGNED.title);
              setBody(SAMPLE_ALIGNED.body);
              setDiff(SAMPLE_ALIGNED.diff);
              setAnalysis(null);
            }}
          >
            载入「一致」样例
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            onClick={() => {
              setTitle(SAMPLE_DRIFT.title);
              setBody(SAMPLE_DRIFT.body);
              setDiff(SAMPLE_DRIFT.diff);
              setAnalysis(null);
            }}
          >
            载入「漂移」样例
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">PR Title</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 outline-none ring-emerald-500/40 focus:ring"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">PR Description</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 outline-none ring-emerald-500/40 focus:ring"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">Diff（{charCount} chars）</span>
          <textarea
            className="min-h-64 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none ring-emerald-500/40 focus:ring"
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
          />
        </label>

        <button
          type="button"
          disabled={loading || !diff.trim()}
          onClick={runAnalyze}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "分析中..." : "开始分析意图一致性"}
        </button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {!analysis ? (
          <p className="text-zinc-400">
            左侧粘贴 PR 标题、描述和 diff，点击分析后，这里会显示一致性分数、漂移项与改写建议。
            未配置 <code className="text-zinc-200">OPENAI_API_KEY</code> 时会自动使用启发式引擎。
          </p>
        ) : (
          <div className="space-y-5">
            <ScoreBadge score={analysis.consistencyScore} level={analysis.level} />
            <div>
              <h3 className="mb-1 text-sm font-medium text-zinc-300">Summary</h3>
              <p className="text-zinc-200">{analysis.summary}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-zinc-300">Stated Intent</h3>
              <p className="text-zinc-300">{analysis.statedIntent}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-zinc-300">Actual Changes</h3>
              <p className="text-zinc-300">{analysis.actualChanges}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">Drift Findings</h3>
              <ul className="space-y-2">
                {analysis.drifts.length === 0 && (
                  <li className="text-zinc-500">无</li>
                )}
                {analysis.drifts.map((d, i) => (
                  <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                    <div className="font-medium text-zinc-100">
                      [{d.severity}] {d.title}
                    </div>
                    <div className="mt-1 text-zinc-400">{d.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">Recommendations</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
                {analysis.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-zinc-500">model: {analysis.model} · id: {analysis.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
