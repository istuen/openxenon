## 方案

### 步骤 1：更新 .gitignore

在 `.gitignore` 末尾添加：

```gitignore
# OpenSpec 工作流
openspec/

# IDE 配置
.kilocode/
.opencode/

# 过时/重复文档
OpenXenon (修订版).md
README-v2.md
```

### 步骤 2：从 git 移除已跟踪的文件

如果这些文件已被 git 跟踪，需要先移除：

```bash
git rm -r --cached openspec/
git rm -r --cached .kilocode/
git rm -r --cached .opencode/
git rm --cached "OpenXenon (修订版).md"
git rm --cached README-v2.md
```

### 步骤 3：推送到远程

```bash
git add .gitignore
git commit -m "chore: ignore sensitive files and directories"
git push yuheng-forgejo dev
```

### 步骤 4：清理远程仓库（如果需要）

如果远程已有这些文件，需要从远程删除：

```bash
git push yuheng-forgejo --delete dev openspec/
git push yuheng-forgejo --delete dev .kilocode/
git push yuheng-forgejo --delete dev .opencode/
git push yuheng-forgejo --delete dev "OpenXenon (修订版).md"
git push yuheng-forgejo --delete dev README-v2.md
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| .gitignore 已更新 | `cat .gitignore` 查看新规则 |
| 文件未被 git 跟踪 | `git status` 显示这些文件为 untracked |
| 可以正常提交 | `git add .gitignore && git commit` 成功 |
| 远程无这些文件 | 访问 forgejo.yuheng.chat 检查 |