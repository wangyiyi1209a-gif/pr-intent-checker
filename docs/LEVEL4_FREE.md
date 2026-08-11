# 第 4 关：免费闭环清单（GitHub App）

目标：在自己的仓库开 PR → 自动出现分析评论。  
**不需要 OpenAI，不需要付费。**

Webhook 固定填：

```text
https://pr-intent-checker.onrender.com/api/webhook/github
```

## 步骤

1. 打开 https://github.com/settings/apps/new 创建 App  
2. Homepage：`https://pr-intent-checker.onrender.com`  
3. Webhook Active + 上面的 URL + 自设 secret  
4. 权限：Contents Read、Pull requests Read & write、Metadata Read  
5. 事件：Pull request  
6. 创建后记下 App ID，生成并下载 Private Key（.pem）  
7. Install App → 只选 `pr-intent-checker`（或你的测试仓库）  
8. Render → Environment 填：
   - `GITHUB_APP_ID`
   - `GITHUB_WEBHOOK_SECRET`
   - `GITHUB_APP_SLUG`
   - `GITHUB_APP_PRIVATE_KEY`（PEM 单行，`\n` 换行）
   - `NEXT_PUBLIC_APP_URL=https://pr-intent-checker.onrender.com`
9. Manual Deploy → 等 Live  
10. 在测试仓库改文件并开 **非 draft** PR，等待评论  

验收：

- App → Advanced → Recent Deliveries 为 200  
- PR 下出现 `PR Intent Consistency Report`  
- `/status` 中「Webhook 可接 PR」为就绪  

私钥与 secret **不要发到聊天里**，不要提交进 Git。
