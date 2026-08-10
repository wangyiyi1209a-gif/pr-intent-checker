"use client";

import { useEffect, useState } from "react";

type Check = {
  id: string;
  label: string;
  ok: boolean;
  optional?: boolean;
  hint: string;
};

type StatusPayload = {
  readyForDemo: boolean;
  readyForWebhook: boolean;
  productionRecommended: boolean;
  publicUrl: string;
  webhookUrlExample: string;
  checks: Check[];
};

export default function StatusPanel() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) return <p className="text-zinc-400">检查配置中…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard
          title="Demo 可展示"
          ok={data.readyForDemo}
          detail="不接 GitHub 也能给人演示"
        />
        <StatusCard
          title="Webhook 可接 PR"
          ok={data.readyForWebhook}
          detail="GitHub App 三项密钥已齐"
        />
        <StatusCard
          title="建议上线标准"
          ok={data.productionRecommended}
          detail="公网 URL + Webhook 配置完整"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-lg font-medium">配置检查</h2>
        <ul className="space-y-3">
          {data.checks.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0"
            >
              <div>
                <div className="font-medium text-zinc-100">
                  {c.label}
                  {c.optional ? (
                    <span className="ml-2 text-xs text-zinc-500">可选</span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-zinc-400">{c.hint}</div>
              </div>
              <span className={c.ok ? "text-emerald-400" : "text-amber-300"}>
                {c.ok ? "OK" : "待补"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-300">
        <p>
          当前公网地址：<code className="text-emerald-300">{data.publicUrl}</code>
        </p>
        <p className="mt-2">
          GitHub Webhook 应填：
          <code className="text-emerald-300">{data.webhookUrlExample}</code>
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  ok,
  detail,
}: {
  title: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`text-sm font-medium ${ok ? "text-emerald-300" : "text-amber-300"}`}>
        {ok ? "已就绪" : "未就绪"}
      </div>
      <div className="mt-1 text-lg text-zinc-50">{title}</div>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}
