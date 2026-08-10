import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6 pt-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400/90">
          GitHub Developer Tool
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          检测 PR 描述与代码改动是否一致
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          PR Intent Checker 会在 Pull Request 打开或更新时，对比标题/描述/commit 与
          diff，自动评论一致性分数与漂移项——帮助 Reviewer 更快抓住风险。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="rounded-xl bg-emerald-500 px-5 py-2.5 font-medium text-zinc-950 hover:bg-emerald-400"
          >
            先跑 Demo（无需 GitHub）
          </Link>
          <Link
            href="/setup"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-medium text-zinc-100 hover:bg-white/10"
          >
            配置 GitHub App 上线
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Webhook 自动分析",
            desc: "监听 pull_request 事件，拉取 diff 与 commit，回写 PR 评论。",
          },
          {
            title: "LLM + 启发式双引擎",
            desc: "有 OpenAI Key 用模型精判；没有 Key 也能本地跑通全流程。",
          },
          {
            title: "可上线可展示",
            desc: "带 Dashboard、健康检查、Docker，方便写进简历与面试演示。",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="mb-2 text-lg font-medium text-zinc-100">{card.title}</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{card.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h2 className="mb-3 text-xl font-medium">推荐学习路径（今天就能出结果）</h2>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
          <li>
            <code className="text-emerald-300">npm run dev</code> → 打开{" "}
            <Link href="/demo" className="text-emerald-300 underline">
              /demo
            </Link>{" "}
            用样例看分数
          </li>
          <li>配置 <code className="text-emerald-300">.env.local</code>（可选 OpenAI）</li>
          <li>按 Setup 页创建 GitHub App + ngrok 本地联调</li>
          <li>Docker / Railway 部署公网，安装到真实仓库</li>
        </ol>
      </section>
    </div>
  );
}
