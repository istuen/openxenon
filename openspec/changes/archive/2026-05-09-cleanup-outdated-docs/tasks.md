## 1. 从 git 移除文件

### 根目录文档
- [x] 1.1 运行 `git rm "OpenXenon (修订版).md"`（未跟踪，无需删除）
- [x] 1.2 运行 `git rm README-v2.md`（未跟踪，无需删除）

### docs/ 文档
- [x] 1.3 运行 `git rm docs/xenonix-concept-white-paper-2.md`
- [x] 1.4 运行 `git rm docs/database.md`
- [x] 1.5 运行 `git rm docs/types.md`
- [x] 1.6 运行 `git rm docs/xdr.md`
- [x] 1.7 运行 `git rm docs/proof-architecture.md`
- [x] 1.8 运行 `git rm docs/proof-development-guide.md`
- [x] 1.9 运行 `git rm docs/skill-development.md`
- [x] 1.10 运行 `git rm docs/adapter-development.md`

## 2. 提交更改

- [x] 2.1 运行 `git add .gitignore`
- [x] 2.2 运行 `git commit -m "chore: remove outdated Xenonix documentation"`
- [x] 2.3 运行 `git push yuheng-forgejo dev`

## 3. 验证

- [x] 3.1 检查 `git status` 确认文件已移除
- [x] 3.2 确认远程仓库无这些文件