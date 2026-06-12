## 1. 添加远程仓库

- [x] 1.1 运行 `git remote add yuheng-forgejo ssh://git@forgejo.yuheng.chat/issac/openxenon.git`

## 2. 验证远程仓库

- [x] 2.1 运行 `git remote -v` 确认远程已添加
- [x] 2.2 运行 `git ls-remote yuheng-forgejo` 测试 SSH 连接（成功，仓库为空）

## 3. 推送代码

- [x] 3.1 运行 `git push yuheng-forgejo dev` 推送 dev 分支