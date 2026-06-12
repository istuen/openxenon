## 1. 修复 Skill 源码

- [x] 1.1 更新 `src/skills/oxn-forge.ts` 中的路径引用：`.openxenon/standards/` → `.openxenon/arsenal/`
- [x] 1.2 更新 `src/skills/oxn-forge.ts` 中的命令引用：`oxn standards inspect` → `oxn arsenal inspect`
- [x] 1.3 更新 `src/skills/oxn-forge.ts` 中的命令引用：`oxn standards promote` → `oxn arsenal promote`

## 2. 重新编译 Skill

- [x] 2.1 重新编译 Skill 到 `.opencode/skills/oxn-forge/SKILL.md`

## 3. 增强 arsenal inspect 默认行为

- [x] 3.1 修改 `src/commands/arsenal-inspect.ts` 无 PATH 参数时列出 DRAFT 资产
- [x] 3.2 实现交互式选择功能

## 4. 验证

- [x] 4.1 运行 `pnpm build` 验证构建成功
- [x] 4.2 运行 `pnpm typecheck` 验证类型检查通过（预先存在的错误除外）
- [x] 4.3 手动测试 `oxn arsenal inspect` 无参数时显示资产列表（需在终端手动验证）
