## 方案

### 步骤 1：从 git 移除已跟踪的文件

删除根目录文档：
```bash
git rm "OpenXenon (修订版).md" README-v2.md
```

删除 docs/ 下文档：
```bash
git rm docs/xenonix-concept-white-paper-2.md
git rm docs/database.md
git rm docs/types.md
git rm docs/xdr.md
git rm docs/proof-architecture.md
git rm docs/proof-development-guide.md
git rm docs/skill-development.md
git rm docs/adapter-development.md
```

### 步骤 2：提交更改

```bash
git add .gitignore
git commit -m "chore: remove outdated Xenonix documentation"
git push yuheng-forgejo dev
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| 文件已删除 | 确认这些文件不存在 |
| git 已移除跟踪 | `git status` 确认无这些文件 |
| 提交成功 | `git log` 确认新提交 |
| 推送成功 | `git ls-remote yuheng-forgejo` 确认远程同步 |