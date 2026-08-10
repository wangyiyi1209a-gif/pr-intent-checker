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
            href="/status"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-medium text-zinc-100 hover:bg-white/10"
          >
            上线就绪检查
          </Link>
          <Link
            href="/setup"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-medium text-zinc-100 hover:bg-white/10"
          >
            配置说明
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">PR 是什么？（30 秒搞懂）</h2>
        <p className="text-zinc-300 leading-relaxed">
          <strong className="text-zinc-50">PR = Pull Request（拉取请求）</strong>
          ：在 GitHub 上，开发者改完代码后发起的「请把我的改动合并进主分支」的请求。
          里面有标题、说明文字，以及真正改动的代码（diff）。
        </p>
        <p className="text-zinc-400 leading-relaxed">
          本工具专门检查：文字里说的意图，和 diff 里真实改动是否一致。不一致就叫
          <span className="text-amber-300">意图漂移</span>
          ——例如标题写「修 README 错别字」，代码却改了登录鉴权。
        </p>
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
            desc: "含 Status 自检、限流、Docker / Render 配置，方便写进简历。",
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
        <h2 className="mb-3 text-xl font-medium">完善到可上线：两步走</h2>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
          <li>
            <strong className="text-zinc-100">A 档</strong>：部署到 Render，让{" "}
            <Link href="/demo" className="text-emerald-300 underline">
              /demo
            </Link>{" "}
            公网可访问（简历就能放链接）
          </li>
          <li>
            <strong className="text-zinc-100">B 档</strong>：创建 GitHub App，装到仓库，开
            PR 自动出评论（完整产品）
          </li>
        </ol>
        <p className="mt-4 text-zinc-400">
          手把手清单见仓库 <code className="text-emerald-300">docs/GO_LIVE.md</code>
          ，部署后打开{" "}
          <Link href="/status" className="text-emerald-300 underline">
            /status
          </Link>{" "}
          对照检查。
        </p>
      </section>
    </div>
  );
}
