import Link from "next/link";

export default function SetupPage() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Setup Guide</h1>
        <p className="mt-2 text-zinc-400">
          按下面顺序做。更细的说明见仓库内{" "}
          <code className="text-emerald-300">docs/LEARNING.md</code> 与{" "}
          <code className="text-emerald-300">docs/GITHUB_APP_SETUP.md</code>。
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">1) 本地跑起来</h2>
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-zinc-200">{`cd "E:\\个人项目vibe coding\\pr-intent-checker"
copy .env.example .env.local
npm install
npm run dev
# 浏览器打开 http://localhost:3000/demo`}</pre>
        <p className="text-zinc-400">
          这一步不需要 GitHub App。先确认 Demo 能出分数，再接 Webhook。
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">2) 创建 GitHub App</h2>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
          <li>
            打开{" "}
            <a
              className="text-emerald-300 underline"
              href="https://github.com/settings/apps/new"
              target="_blank"
            >
              github.com/settings/apps/new
            </a>
          </li>
          <li>Webhook URL：本地用 ngrok，例如 <code>https://xxxx.ngrok-free.app/api/webhook/github</code></li>
          <li>Webhook secret：自己设一串随机字符，写入 <code>GITHUB_WEBHOOK_SECRET</code></li>
          <li>
            Repository permissions：<strong>Contents: Read</strong>，
            <strong>Pull requests: Read & Write</strong>，
            <strong>Metadata: Read</strong>
          </li>
          <li>Subscribe to events：勾选 <strong>Pull request</strong></li>
          <li>生成 Private Key，下载 .pem；App ID 记下来</li>
          <li>Install App 到你的测试仓库</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">3) 环境变量</h2>
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-zinc-200">{`GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_APP_SLUG=your-app-slug
OPENAI_API_KEY=sk-...          # 可选，不填则用启发式
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">4) 本地联调 Webhook</h2>
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-zinc-200">{`# 终端 A
npm run dev

# 终端 B（需先安装 ngrok）
ngrok http 3000
# 把 GitHub App 的 Webhook URL 改成 ngrok 域名 + /api/webhook/github
# 在测试仓库开一个 PR，看是否自动出现评论`}</pre>
        <p className="text-zinc-400">
          也可用 <Link href="/dashboard" className="text-emerald-300 underline">Dashboard</Link>{" "}
          与 <code>/api/health</code> 排查。
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h2 className="text-xl font-medium text-zinc-100">5) 上线</h2>
        <p className="text-zinc-300">
          详见 <code>docs/DEPLOY.md</code>。推荐 Railway / Fly.io / 任意 Docker 主机。把
          Webhook URL 换成公网域名后，再 Install 到真实仓库即可。
        </p>
      </section>
    </div>
  );
}
