# AGENTS.md

面向在本仓库工作的 AI 编码代理与协作者的项目约定。

## 提交安全（强制）

本地提交前必须确保提交内容不包含任何敏感信息，包括但不限于：

- API key、token、签名密钥、证书私钥（`.pem` / `.key` 文件、`-----BEGIN … PRIVATE KEY-----` 密钥块等）
- 数据库/服务连接串、内网地址、硬编码的账号密码
- 个人身份信息（邮箱、手机号、证件号等）
- 日志、截图、调试数据中泄露的敏感上下文

要求：

- 提交前自查暂存区内容（`git diff --cached`）；发现敏感信息先移除或改为环境变量/外部配置，不要提交。
- 不应入库的本地文件（如 `.env`、密钥文件）保持被 `.gitignore` 忽略。
- 仓库自带 pre-commit 钩子做敏感信息扫描（`scripts/githooks/pre-commit`），新 clone 后执行
  `git config core.hooksPath scripts/githooks` 启用；确认误报时可在该行末尾加标记 `secret-scan:allow`，
  或用 `git commit --no-verify` 跳过。
