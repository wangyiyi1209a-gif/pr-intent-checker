# 上线完整清单（按这个做就能给人用）

> 目标：别人打开你的网址能用 Demo；你把 GitHub App 装到仓库后，开 PR 会自动出评论。

---

## 先搞清：PR 是什么？

**PR = Pull Request（拉取请求）**

在 GitHub 上，你改完代码后，不是直接塞进主分支，而是提一个「合并请求」，请别人审查后再合并。这个请求就叫 **PR**。

一个 PR 通常包含：

| 部分 | 含义 | 本项目怎么用 |
| --- | --- | --- |
| Title | 标题，如 `fix: 登录空指针` | 当作「声称意图」 |
| Description | 正文说明 | 当作「声称意图」 |
| Commits | 提交说明 | 辅助判断意图 |
| Diff | 实际改了哪些代码 | 当作「真实行为」 |

**本项目做的事**：看你「说要干什么」和「代码真改了什么」是否一致。不一致就叫**意图漂移**。

---

## 上线分两档（先做 A，再做 B）

### A 档：公网 Demo 可访问（简历已能写链接）

只需要网站能打开 `/demo`，**不必**先配 GitHub App。

### B 档：真实仓库自动评论（完整产品）

在 A 的基础上，配置 GitHub App + Webhook。

---

## 阶段 A：部署到公网（推荐 Render 免费档）

### A1. 把代码推到你自己的 GitHub 仓库

```powershell
cd "E:\个人项目vibe coding\pr-intent-checker"
git init
git add .
git commit -m "feat: PR Intent Checker MVP ready for deploy"
```

去 GitHub 新建空仓库（不要勾选 README），然后：

```powershell
git remote add origin https://github.com/你的用户名/pr-intent-checker.git
git branch -M main
git push -u origin main
```

### A2. 用 Render 一键部署

1. 打开 https://render.com 注册/登录（可用 GitHub 登录）
2. **New → Web Service** → 选中刚才的仓库
3. 设置：
   - **Runtime**: Docker（本仓库有 `Dockerfile`）
   - 或 Node：Build `npm install && npm run build`，Start `npm run start`
4. 先只加这些环境变量（A 档最小集）：

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 先填 Render 给你的地址，如 `https://pr-intent-checker-xxxx.onrender.com` |
| `OPENAI_API_KEY` | 可选；不填也能用启发式 |

5. Create Web Service，等 Deploy Live
6. 打开：
   - `https://你的域名/demo`
   - `https://你的域名/status`
   - `https://你的域名/api/health`

**验收 A 档成功**：Demo 能出分数，`/api/health` 返回 `ok: true`。

> Render 免费实例会休眠，第一次打开可能要等 30–60 秒，正常。

---

## 阶段 B：接上真实 GitHub PR

### B1. 创建 GitHub App

打开：https://github.com/settings/apps/new

按 `docs/GITHUB_APP_SETUP.md` 填：

- Webhook URL：`https://你的域名/api/webhook/github`
- Webhook secret：自己生成一串
- 权限：Contents Read、Pull requests Read&Write、Metadata Read
- 事件：Pull request
- 生成 Private Key（下载 `.pem`）

### B2. 在 Render 补齐环境变量

| Key | Value |
| --- | --- |
| `GITHUB_APP_ID` | App 数字 ID |
| `GITHUB_APP_PRIVATE_KEY` | pem 全文，换行改成 `\n`，用双引号包起来 |
| `GITHUB_WEBHOOK_SECRET` | 与 App 里一致 |
| `GITHUB_APP_SLUG` | App 的 URL slug |
| `NEXT_PUBLIC_APP_URL` | `https://你的域名` |
| `OPENAI_API_KEY` | 可选 |

保存后 **手动 Trigger Deploy** 重启一次。

### B3. Install App 到测试仓库

App 页 → Install App → 只选一个测试仓库。

### B4. 开一个测试 PR

在测试仓库改个文件，提 PR。期望：

1. GitHub App → Advanced → Recent Deliveries 出现 `200`
2. PR 评论区出现 `PR Intent Consistency Report`
3. 网站 `/dashboard` 多一条 `source=webhook`（若磁盘可写）

**验收 B 档成功**：真实 PR 自动出评论。

---

## 私钥怎么变成一行（Windows）

```powershell
$pem = Get-Content "$env:USERPROFILE\Downloads\xxxx.private-key.pem" -Raw
($pem -replace "`r`n", "\n" -replace "`n", "\n")
```

把输出贴到 `GITHUB_APP_PRIVATE_KEY`。

---

## 上线后自检（务必做）

打开 `/status`，确认：

- [ ] Demo 可展示 = 已就绪
- [ ] Webhook 可接 PR = 已就绪（B 档）
- [ ] 建议上线标准 = 已就绪（B 档）

再检查：

- [ ] `/api/health` → `ok: true`
- [ ] `/demo` 漂移样例分数明显偏低
- [ ] 真实 PR 评论存在且再次 push 是**更新**同一条评论

---

## 简历怎么写（上线后）

```
PR Intent Checker | 个人项目（已上线）| https://你的域名
- 基于 GitHub App Webhook，自动检测 PR 描述与 diff 的意图漂移并回写评论
- Next.js + Octokit + OpenAI（可选）+ Docker；含限流与签名校验
- 提供公网 Demo 与真实仓库安装能力
```

---

## 你卡在哪一步时怎么排障

| 现象 | 处理 |
| --- | --- |
| 网站打不开 | Render Logs 看 build/start 错误；确认端口 3000 |
| Demo 500 | 看日志；磁盘只读时分析仍返回，只是不落盘 |
| Webhook 401 | secret 不一致，或中间层改了 body |
| Webhook 500 private key | PEM 格式/`\n` 不对 |
| 有事件无评论 | 权限缺 Write；PR 是 draft；看 Deliveries 响应体 |

更细步骤：`LEARNING.md`、`GITHUB_APP_SETUP.md`、`DEPLOY.md`。
