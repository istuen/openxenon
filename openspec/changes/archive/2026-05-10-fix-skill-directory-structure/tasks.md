## 1. 修改 compileSkill()

- [x] 1.1 修改 `outputPath` 从 `.opencode/skills/<skillId>.md` 改为 `.opencode/skills/<skillId>/SKILL.md`
- [x] 1.2 确保目录创建逻辑正确（已存在，dirname + recursive mkdir）

## 2. 清理旧文件（可选）

- [x] 2.1 检查发现 `.opencode/skills/` 下无单文件 `.md`（已清理或不存在）

## 3. 验证

- [x] 3.1 `pnpm run typecheck` ✓
- [x] 3.2 `pnpm run build` ✓
- [x] 3.3 `oxn init -f` - Skills 已生成到新路径 `.opencode/skills/<skillId>/SKILL.md` ✓