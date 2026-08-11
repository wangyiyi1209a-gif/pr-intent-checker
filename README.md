# PR Intent Checker

> 检测 GitHub Pull Request「文字意图」与「真实 diff」是否一致，输出一致性分数与漂移项。  
> 可公网 Demo，可接 GitHub App 自动评论。**无 OpenAI Key 也能完整演示（启发式引擎）。**

**在线 Demo：** https://pr-intent-checker.onrender.com/demo  
**状态页：** https://pr-intent-checker.onrender.com/status  
**源码仓库：** https://github.com/wangyiyi1209a-gif/pr-intent-checker

---

## 一句话介绍

Reviewer 经常遇到：PR 标题写「修个 README 错别字」，diff 却偷偷改了登录鉴权或依赖。  
本工具自动对比 **声称要做什么** vs **代码实际改了什么**，标出意图漂移（Intent Drift）。

---

## 架构（一句话 + 图）

**GitHub 发 Webhook → 本服务验签并拉取 PR/diff → 启发式或 LLM 分析 → 回写同一条 PR 评论；同时提供网页 Demo 不依赖 GitHub。**

```text
┌─────────────┐     pull_request      ┌──────────────────────┐
│   GitHub    │ ───────────────────► │  Next.js on Render   │
│  (PR 事件)   │                       │  /api/webhook/github │
└─────────────┘                       └──────────┬───────────┘
                                                 │
                     ┌───────────────────────────┼───────────────────────────┐
                     ▼                           ▼                           ▼
              拉 title/body/diff           analyze（启发式/LLM）         upsert PR 评论
                     │                           │
                     └──────────► data/analyses.json + /dashboard ◄──────────┘

另：浏览器 ──► /demo ──► /api/analyze（同一套分析引擎，无需安装 App）
```

---

## 和同类项目比，有什么不一样？

开源里已有相近方向（如 Verdict、IntentGuard、部分 CI Guard 的 intent 规则），**不是「全世界第一个」**。  
你的作品优势在于 **可展示的产品化闭环 + 零成本可演示**，适合写进简历：

| 点 | 本项目 | 很多同类 |
| --- | --- | --- |
| 公网可点的 Demo 站 | ✅ 已上线 | 多为 Action/CLI，难立刻体验 |
| 无 LLM Key 也能跑通 | ✅ 启发式降级 | 多数强依赖付费模型 |
| 中文学习/上线文档 | ✅ | 多为英文 |
| 你能讲清全栈链路 | Webhook 验签 → App 鉴权 → 分析 → 评论 | 容易变成「调了个 API」 |

面试建议这样说：  
> 问题空间不新，但我把它做成了可安装、可公网演示、可零成本降级的端到端系统；核心工程能力在 Webhook、权限、部署与可观测，而不是套壳聊天。

---

## 功能

- **Interactive Demo**：粘贴 title / description / diff，或一键载入「一致 / 漂移」样例  
- **GitHub App Webhook**：PR `opened / synchronize / edited / …` 时自动分析并评论  
- **双引擎**：有 `OPENAI_API_KEY` 用 LLM；没有则用启发式（docs-only vs 改 auth 等规则）  
- **Dashboard / Status**：历史记录与上线就绪自检  
- **安全基线**：Webhook 签名校验、接口限流、diff 长度限制  

---

## 5 分钟本地运行

```powershell
git clone https://github.com/wangyiyi1209a-gif/pr-intent-checker.git
cd pr-intent-checker
copy .env.example .env.local
npm install
npm run dev
```

打开：

| 地址 | 作用 |
| --- | --- |
| http://localhost:3000/demo | 交互演示 |
| http://localhost:3000/dashboard | 分析历史 |
| http://localhost:3000/status | 配置是否就绪 |
| http://localhost:3000/api/health | 健康检查 |

命令行快速自测：

```powershell
npm run simulate
npx tsx scripts/test-heuristic.ts
```

---

## 公网地址（已部署）

| 页面 | URL |
| --- | --- |
| 首页 | https://pr-intent-checker.onrender.com |
| Demo | https://pr-intent-checker.onrender.com/demo |
| Status | https://pr-intent-checker.onrender.com/status |
| Health | https://pr-intent-checker.onrender.com/api/health |

> Render Free 闲置会休眠，第一次打开可能要等 30–60 秒。

---

## 接 GitHub App（第 4 关，可全程免费）

不需要 OpenAI。按 [docs/GITHUB_APP_SETUP.md](docs/GITHUB_APP_SETUP.md) 与 [docs/GO_LIVE.md](docs/GO_LIVE.md) B 档：

1. 创建 GitHub App，Webhook：`https://pr-intent-checker.onrender.com/api/webhook/github`  
2. 权限：Contents Read、Pull requests Read&Write、Metadata Read；事件勾选 Pull request  
3. 在 Render Environment 填 `GITHUB_APP_ID` / `PRIVATE_KEY` / `WEBHOOK_SECRET`  
4. Install 到测试仓库 → 开一个非 draft PR → 看自动评论  

本地联调也可用 ngrok，见 [docs/LEARNING.md](docs/LEARNING.md)。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| Web / API | Next.js 15（App Router）、TypeScript |
| GitHub | Octokit App Auth、Webhook 验签 |
| 分析 | 启发式引擎 + 可选 OpenAI 兼容 API |
| 部署 | Docker、Render |

---

## 环境变量

复制 `.env.example` → `.env.local`（或填到 Render Environment）：

| 变量 | 必须？ | 含义 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | 推荐 | 公网地址，写入评论链接 |
| `GITHUB_APP_ID` | 接 Webhook 时 | App ID |
| `GITHUB_APP_PRIVATE_KEY` | 接 Webhook 时 | PEM（换行写成 `\n`） |
| `GITHUB_WEBHOOK_SECRET` | 接 Webhook 时 | Webhook secret |
| `OPENAI_API_KEY` | 可选 | 不填则纯启发式，**不产生模型费用** |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | 可选 | 兼容网关与模型名 |

---

## 目录结构（核心）

```text
src/app/api/webhook/github/route.ts  # GitHub Webhook 入口
src/app/api/analyze/route.ts         # Demo / 手动分析
src/lib/analyze.ts                   # 启发式 + LLM
src/lib/github.ts                    # 拉取 PR 上下文
src/lib/comment.ts                   # 评论生成与防刷屏更新
docs/GO_LIVE.md                      # 上线清单
docs/GITHUB_APP_SETUP.md             # App 创建步骤
```

---

## 简历写法（可直接改）

**PR Intent Checker**｜个人项目（已上线）  
Demo：https://pr-intent-checker.onrender.com　｜　代码：https://github.com/wangyiyi1209a-gif/pr-intent-checker  

- 针对 PR「描述意图 vs 真实 diff」不一致问题，提供分数、漂移项与改写建议  
- 实现 GitHub App Webhook 全链路（验签、Installation Token、PR 评论 upsert）  
- Next.js + Docker 部署于 Render；无付费 LLM 时以启发式降级保证可演示  
- 提供公网 Demo 与 Status 自检，方便面试当场演示  

---

## License

MIT
