## 1. 定位 Skill 编译错误

- [x] 1.1 全局搜索"技能必须提供名称"错误信息来源
- [x] 1.2 确认错误是 `defaultRender()` 输出 YAML frontmatter 使用 `skill:` 而非 `name:`
- [x] 1.3 修复: 将 `skill:` 改为 `name:` 以符合 SKILL.md 格式要求
- [x] 1.4 验证: 重新编译后 VSCode promp diagnostics 不再报错

## 2. 实现 init -f 更新 Skills

- [x] 2.1 `src/cli/init.ts` 添加 `--force/-f` 参数
- [x] 2.2 force 时调用 `compileAllSkills('opencode', projectPath, true)` 强制更新所有 Skills
- [x] 2.3 测试: 运行 `oxn init -f` 后检查 `.opencode/skills/` 下的 Skills 是否更新
