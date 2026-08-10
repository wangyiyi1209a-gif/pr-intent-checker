# PR Intent Checker

> 检测 GitHub Pull Request「文字意图」与「真实 diff」是否一致，自动在 PR 下评论一致性报告。

适合作为研究生/求职作品：可上线、有真实 Webhook 链路、能讲清工程与 LLM 落地。

---

## 它解决什么问题？

很多 PR 写着「修个小 typo」，实际 diff 却改了鉴权、依赖、大段重构。Reviewer 时间有限，容易漏看。

本项目在 `opened / synchronize / edited` 时：

1. 拉取 PR 标题、描述、commit、文件 patch  
2. 用 LLM（或启发式引擎）做意图一致性分析  
3. 在 PR 下发布/更新一份结构化评论（分数、漂移项、建议）

---

## 技术栈

| 层 | 技术 | 作用 |
| --- | --- | --- |
| Web | Next.js 15 (App Router) | 官网、Demo、Dashboard、API |
| GitHub | Octokit App Auth + Webhooks | 收事件、读 PR、写评论 |
| AI | OpenAI API（可选） | 语义级意图 vs diff 对比 |
| 存储 | `data/analyses.json` | 本地/单机持久化分析记录 |
| 部署 | Docker / docker-compose | 一键上线 |

---

## 上线给人用

请直接按 **[docs/GO_LIVE.md](docs/GO_LIVE.md)** 两档推进：

1. **A 档**：Render 部署公网 Demo（简历可放链接）  
2. **B 档**：配置 GitHub App，真实 PR 自动评论  

部署后打开 `/status` 做就绪自检。

---

## 5 分钟本地体验（不必接 GitHub）

在 PowerShell：

```powershell
cd "E:\个人项目vibe coding\pr-intent-checker"
copy .env.example .env.local
npm install
npm run dev
```

浏览器打开：

- http://localhost:3000/demo — 粘贴 PR / 用样例分析  
- http://localhost:3000/dashboard — 看历史记录  
- http://localhost:3000/api/health — 健康检查  

命令行自测：

```powershell
npm run simulate
```

---

## 目录结构（你要懂的核心文件）

```
src/
  app/
    page.tsx                 # 首页
    demo/page.tsx            # 交互 Demo
    dashboard/page.tsx       # 分析历史
    setup/page.tsx           # 配置指引页
    api/
      health/route.ts        # GET 健康检查
      analyze/route.ts       # POST 手动分析
      analyses/route.ts      # GET 历史
      webhook/github/route.ts# GitHub Webhook 主入口
  lib/
    config.ts                # 读环境变量
    analyze.ts               # LLM + 启发式分析
    github.ts                # 拉 PR 上下文
    comment.ts               # 生成/更新 PR 评论
    store.ts                 # JSON 存储
    prompts.ts               # Prompt
    types.ts                 # 类型
  components/                # 前端组件
docs/
  LEARNING.md                # 手把手学习路径（先看这个）
  GITHUB_APP_SETUP.md        # 创建 GitHub App
  DEPLOY.md                  # 上线
scripts/simulate-pr.ts       # CLI 自测
```

---

## 接 GitHub（本地 ngrok）

详见：

- [docs/LEARNING.md](docs/LEARNING.md)  
- [docs/GITHUB_APP_SETUP.md](docs/GITHUB_APP_SETUP.md)  
- 网页 [/setup](http://localhost:3000/setup)

最小权限：

- Contents: Read  
- Pull requests: Read & Write  
- Metadata: Read  
- Event: Pull request  

---

## 环境变量

复制 `.env.example` → `.env.local`。关键项：

| 变量 | 是否必须 | 含义 |
| --- | --- | --- |
| `GITHUB_APP_ID` | 接 Webhook 必须 | App ID |
| `GITHUB_APP_PRIVATE_KEY` | 接 Webhook 必须 | PEM 私钥（`\n` 单行） |
| `GITHUB_WEBHOOK_SECRET` | 接 Webhook 必须 | Webhook 签名密钥 |
| `OPENAI_API_KEY` | 可选 | 不填则启发式 |
| `OPENAI_MODEL` | 可选 | 默认 `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | 推荐 | 评论里的产品链接 |

---

## Docker 上线

```powershell
docker compose up --build -d
```

详见 [docs/DEPLOY.md](docs/DEPLOY.md)。

---

## 简历怎么写（可直接改）

**PR Intent Checker**｜个人项目（已上线）｜`https://你的域名`  
- 构建 GitHub App：在 PR 打开/更新时自动对比描述与 diff，检测意图漂移并回写评论  
- 技术：Next.js、Octokit、Webhook 验签、OpenAI、Docker  
- 双引擎：LLM 精判 + 无 Key 启发式降级，保证链路可演示  
- 结果：…（补：安装仓库数 / 分析次数 / 人工抽检一致率）

---

## License

MIT（可自行添加 LICENSE 文件）
