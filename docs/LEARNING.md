# 学习路径：从 0 到可上线

本文件按「你要执行什么 → 这段代码干什么」讲解。建议严格按 Step 顺序做。

---

## Step 0：你在做的系统长什么样

```
GitHub 仓库开 PR
    │
    ▼
GitHub 向你的服务器发 Webhook (POST /api/webhook/github)
    │
    ▼
验签 → 用 GitHub App 身份拉 PR 标题/描述/commits/diff
    │
    ▼
analyzePullRequest()  （LLM 或启发式）
    │
    ├─► 写入 data/analyses.json
    └─► 在 PR 下创建/更新评论
```

另外还有一条**不依赖 GitHub**的路径，方便你先学会核心算法：

```
浏览器 /demo  →  POST /api/analyze  →  同一套 analyzePullRequest()
```

---

## Step 1：安装依赖并启动

### 你要执行的命令

```powershell
cd "E:\个人项目vibe coding\pr-intent-checker"
copy .env.example .env.local
npm install
npm run dev
```

### 这些命令分别干什么

| 命令 | 作用 |
| --- | --- |
| `copy .env.example .env.local` | 生成本地环境变量文件（Next.js 会自动读取 `.env.local`） |
| `npm install` | 安装 `package.json` 里的依赖（Next、Octokit、OpenAI、zod…） |
| `npm run dev` | 启动开发服务器，默认 `http://localhost:3000`，改代码自动热更新 |

### 你应该看到的结果

- 终端出现 `Ready` / `Local: http://localhost:3000`  
- 浏览器打开首页有「PR Intent Checker」导航  

若端口被占用：

```powershell
npx next dev -p 3001
```

---

## Step 2：不接 GitHub，先跑通分析引擎

### 方式 A：网页 Demo

1. 打开 http://localhost:3000/demo  
2. 点「载入『漂移』样例」  
3. 点「开始分析意图一致性」  

**发生了什么？**

- 前端组件 `src/components/DemoAnalyzer.tsx` 发 `POST /api/analyze`  
- `src/app/api/analyze/route.ts` 校验输入  
- `src/lib/analyze.ts` 的 `analyzePullRequest()` 真正算分  
- `src/lib/store.ts` 把结果写入 `data/analyses.json`  
- Dashboard 页面会读 `/api/analyses` 展示历史  

### 方式 B：命令行

```powershell
npm run simulate
```

对应脚本：`scripts/simulate-pr.ts`  
它直接 `import { analyzePullRequest }`，不经过 HTTP，适合调试算法。

### 现在有没有 OpenAI Key？

- **没有**：走 `heuristicAnalyze()`（关键词重合、文件数、空描述等规则）  
- **有**：在 `.env.local` 写上 `OPENAI_API_KEY=sk-...`，重启 `npm run dev`，会走 LLM  

两种都能完成简历 Demo；有 Key 后效果更「智能」。

---

## Step 3：读懂核心代码（面试能讲）

按这个顺序读，每次只问自己「输入是什么、输出是什么」：

1. `src/lib/types.ts` — 数据结构  
2. `src/lib/analyze.ts` — 评分大脑（最重要）  
3. `src/lib/prompts.ts` — 给 LLM 的指令  
4. `src/app/api/analyze/route.ts` — HTTP 封装  
5. `src/app/api/webhook/github/route.ts` — 线上主链路  
6. `src/lib/github.ts` — 怎么向 GitHub 要 diff  
7. `src/lib/comment.ts` — 评论 Markdown 与防刷屏更新  

### 面试一句话版

> Webhook 验签后，用 GitHub App Installation Token 拉取 PR 上下文，把 title/body/commits/diff 送给分析器；分析器优先 LLM，失败或无 Key 时降级启发式；结果 upsert 到同一条 PR 评论，并落盘便于 Dashboard 展示。

---

## Step 4：健康检查与 API 手玩

保持 `npm run dev` 开着，另开 PowerShell：

```powershell
# 健康检查
curl http://localhost:3000/api/health

# 手动分析
curl http://localhost:3000/api/analyze -Method POST -ContentType "application/json" -Body '{
  "title": "docs: fix typo",
  "body": "typo only",
  "diff": "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-hello\n+hello world\n",
  "source": "manual"
}'
```

| 接口 | 方法 | 作用 |
| --- | --- | --- |
| `/api/health` | GET | 看服务是否活着、是否配置了 App/LLM |
| `/api/analyze` | POST | 手动分析 |
| `/api/analyses` | GET | 历史列表 |
| `/api/webhook/github` | POST | 仅 GitHub 调用（需签名） |

---

## Step 5：创建 GitHub App + ngrok 联调

完整点击步骤见 `GITHUB_APP_SETUP.md`。这里是命令摘要：

```powershell
# 终端 1
npm run dev

# 终端 2（先安装 ngrok: https://ngrok.com/download）
ngrok http 3000
```

把 ngrok 给出的 `https://xxxx.ngrok-free.app/api/webhook/github` 填进 GitHub App Webhook URL。

`.env.local` 填好 `GITHUB_APP_*` 后**重启** `npm run dev`。

在测试仓库开一个 PR，几秒内应出现 bot 评论。

---

## Step 6：上线给人用

见 `DEPLOY.md`。上线后把 Webhook URL 换成公网域名，把 App Install 到真实仓库，简历里放链接。

---

## 常见问题

### 1. Demo 能用，Webhook 401

签名不对：检查 `GITHUB_WEBHOOK_SECRET` 是否与 GitHub App 里填的一致；是否用了 raw body 验签（本项目已用 `req.text()`，不要改成先 `req.json()`）。

### 2. Webhook 500：private key

PEM 必须保留 `BEGIN/END` 行；在 `.env.local` 里换行写成 `\n`，整段加双引号。

### 3. 评论没出现

- App 是否 Install 到该仓库  
- 权限是否包含 Pull requests: Write  
- PR 是否是 draft（本项目默认忽略 draft）  
- 看终端报错 / GitHub App → Advanced → Recent Deliveries  

### 4. Windows 路径中文

本项目路径含中文一般没问题；若工具报错，可用 `subst` 映射盘符，例如：

```powershell
subst P: "E:\个人项目vibe coding"
cd P:\pr-intent-checker
```

---

## 建议你本周完成的里程碑

| 天 | 目标 |
| --- | --- |
| Day 1 | Demo + simulate 跑通，能讲清 analyze.ts |
| Day 2 | GitHub App + ngrok，真实 PR 出现评论 |
| Day 3 | 加 OpenAI Key，对比启发式 vs LLM |
| Day 4 | Docker 部署公网，改 Webhook URL |
| Day 5 | 写 README 截图 + 简历 bullet + 录 1 分钟 Demo 视频 |
