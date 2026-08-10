# 部署上线指南

目标：让公网能访问你的服务，GitHub 能打到 Webhook。

> 注意：本项目用本地 JSON 文件存分析记录，**适合单实例 Docker / VPS**。  
> 若部署到 Vercel 无磁盘写权限的环境，Demo API 仍可做只读演示，但 `saveAnalysis` 会失败——此时请改用带持久磁盘的平台（Railway、Fly.io、自己的服务器）。

---

## 方案 A：Docker Compose（VPS / 家里电脑公网）

### 1. 准备环境变量

服务器上创建 `.env.local`（内容同本地，但 URL 改公网）：

```env
NEXT_PUBLIC_APP_URL=https://pr.example.com
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
```

### 2. 构建并启动

```bash
docker compose up --build -d
curl http://localhost:3000/api/health
```

### 3. 反代（可选 Nginx）

把 `pr.example.com` 反代到 `127.0.0.1:3000`，配 HTTPS（Let’s Encrypt）。

### 4. 改 GitHub App

Webhook URL → `https://pr.example.com/api/webhook/github`

---

## 方案 B：Railway

1. 用 GitHub 登录 Railway，New Project → Deploy from repo  
2. Root Directory 选 `pr-intent-checker`（若整个 mono 仓库）  
3. 添加环境变量（同上）  
4. 若用 Dockerfile，Railway 会自动识别；确保有持久卷挂载 `/app/data`（可选）  
5. 生成域名后写入 `NEXT_PUBLIC_APP_URL`  

Build 命令：`npm run build`  
Start 命令：`npm run start`  

（若不走 Docker，需注意 serverless 磁盘限制；推荐在 Railway 选 Docker 部署。）

---

## 方案 C：仅 Demo 静态展示（求职临时）

如果暂时搞不定 GitHub App：

1. 本地录屏 `/demo` 漂移样例  
2. 把站点部署到任意能跑 Next 的地方  
3. 简历写「提供 Web Demo + GitHub App 架构已实现，Webhook 可在自有仓库复现」  

核心代码完整即可，面试时现场 `npm run simulate` 也很加分。

---

## 上线验收清单

- [ ] `GET /api/health` 返回 `ok: true`  
- [ ] `/demo` 能分析并在 `/dashboard` 看到记录  
- [ ] GitHub Recent Deliveries 全绿  
- [ ] 真实 PR 出现报告评论  
- [ ] 再次 push 同一 PR，评论是**更新**而不是刷出一堆新评论  

---

## 安全建议（简历项目也要有）

1. **永远不要**把 `.pem`、`.env.local` 提交到 Git（已在 `.gitignore`）  
2. Webhook 必须验签（已实现）  
3. 生产环境限制日志里打印 diff 的长度  
4. 后续可加：管理后台登录、按 installation 隔离数据、Rate limit  
