"use client";

import { useEffect, useState } from "react";
import type { IntentAnalysis } from "@/lib/types";

function levelClass(level: string) {
  if (level === "aligned") return "text-emerald-300";
  if (level === "minor_drift") return "text-amber-300";
  if (level === "major_drift") return "text-rose-300";
  return "text-zinc-300";
}

export default function AnalysisTable() {
  const [items, setItems] = useState<IntentAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "failed");
        setItems(data.analyses);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!items.length) {
    return (
      <p className="text-zinc-400">
        还没有分析记录。先去{" "}
        <a className="text-emerald-300 underline" href="/demo">
          Demo
        </a>{" "}
        跑一条，或等待 GitHub Webhook 触发。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Title / PR</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Level</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-white/10">
              <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                {new Date(item.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">{item.source}</td>
              <td className="px-4 py-3">
                {item.prUrl ? (
                  <a className="text-emerald-300 hover:underline" href={item.prUrl} target="_blank">
                    {item.repo}#{item.prNumber} · {item.title || "(no title)"}
                  </a>
                ) : (
                  <span>{item.title || "(no title)"}</span>
                )}
              </td>
              <td className="px-4 py-3 tabular-nums">{item.consistencyScore}</td>
              <td className={`px-4 py-3 ${levelClass(item.level)}`}>{item.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
