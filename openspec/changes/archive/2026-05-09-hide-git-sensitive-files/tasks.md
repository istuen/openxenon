## 1. 更新 .gitignore

- [x] 1.1 在 `.gitignore` 末尾添加 openspec/ 规则
- [x] 1.2 添加 .kilocode/ 规则
- [x] 1.3 添加 .opencode/ 规则
- [x] 1.4 添加 `OpenXenon (修订版).md` 规则
- [x] 1.5 添加 README-v2.md 规则

## 2. 从 git 移除已跟踪的文件

- [x] 2.1 运行 `git rm -r --cached openspec/`（如果已跟踪）
- [x] 2.2 运行 `git rm -r --cached .kilocode/`（如果已跟踪）
- [x] 2.3 运行 `git rm -r --cached .opencode/`（如果已跟踪）
- [x] 2.4 运行 `git rm --cached "OpenXenon (修订版).md"`（如果已跟踪）
- [x] 2.5 运行 `git rm --cached README-v2.md`（如果已跟踪）

## 3. 提交更改

- [x] 3.1 运行 `git add .gitignore`
- [x] 3.2 运行 `git commit -m "chore: ignore sensitive files and directories"`
- [x] 3.3 运行 `git push yuheng-forgejo dev`

## 4. 验证

- [x] 4.1 检查 `git status` 确认文件为 untracked/untracked
- [x] 4.2 确认远程仓库无这些文件（推送成功，远程已同步）