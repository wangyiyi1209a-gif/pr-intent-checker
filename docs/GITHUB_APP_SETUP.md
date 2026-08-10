# 创建 GitHub App（图文步骤文字版）

## 1. 新建 App

打开：https://github.com/settings/apps/new

建议填写：

- **GitHub App name**：例如 `pr-intent-checker-你的名字`（全局唯一）  
- **Homepage URL**：`http://localhost:3000`（上线后改成你的域名）  
- **Webhook**  
  - Active：勾选  
  - Webhook URL：先填 ngrok，例如 `https://abc123.ngrok-free.app/api/webhook/github`  
  - Webhook secret：自己生成一串，例如用 PowerShell：

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

把这串同时写入 GitHub 页面和本地 `.env.local` 的 `GITHUB_WEBHOOK_SECRET`。

## 2. 权限（Repository permissions）

| 权限 | 级别 | 为什么 |
| --- | --- | --- |
| Metadata | Read-only | 默认需要 |
| Contents | Read-only | 读文件/对比内容 |
| Pull requests | Read & write | 读 PR + 发评论 |

其余可保持 No access。

## 3. 事件订阅

Subscribe to events 勾选：

- **Pull request**

（足够覆盖 opened / synchronize / edited 等）

## 4. 创建后拿到的密钥

1. 记下 **App ID** → `GITHUB_APP_ID`  
2. 记下 **Slug**（URL 里那串）→ `GITHUB_APP_SLUG`  
3. 拉到页面底部 **Private keys → Generate a private key**，下载 `.pem`  

把 pem 内容转成单行：

```powershell
# 假设文件在 Downloads
$pem = Get-Content "$env:USERPROFILE\Downloads\your-app.YYYY-MM-DD.private-key.pem" -Raw
$pem = $pem -replace "`r`n", "\n" -replace "`n", "\n"
$pem   # 复制输出到 .env.local 的 GITHUB_APP_PRIVATE_KEY="..."
```

示例形态：

```env
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

## 5. Install App

App 页面 → **Install App** → 选择你的账号/组织 → 只勾选一个**测试仓库**。

## 6. 本地联调检查清单

- [ ] `npm run dev` 正在跑  
- [ ] ngrok 指向 3000  
- [ ] Webhook URL 带 `/api/webhook/github`  
- [ ] `.env.local` 已填齐并重启过 dev server  
- [ ] 测试仓库已 Install  
- [ ] 新建非 draft 的 PR  

成功标志：

1. GitHub App → Advanced → Recent Deliveries 显示 `200`  
2. PR 评论区出现 `PR Intent Consistency Report`  
3. http://localhost:3000/dashboard 多了一条 `source=webhook`  

## 7. 上线后要改什么

1. `NEXT_PUBLIC_APP_URL` 改为公网域名  
2. GitHub App Webhook URL 改为 `https://你的域名/api/webhook/github`  
3. Homepage URL 同步修改  
4. 重新 Install / 确认仍有权限  
