## 1. 基础设施

- [x] 1.1 创建 `src/skills/types.ts` 定义 XenonixSkill 接口
- [x] 1.2 创建 `src/skills/index.ts` 统一导出所有 Skill
- [x] 1.3 扩展 core.db schema 添加 daemon_address 存储
- [x] 1.4 创建 `src/adapters/index.ts` 适配器注册中心

## 2. Skill TypeScript 源码

- [x] 2.1 创建 `src/skills/xn-init.ts` - /xn-init 指令定义
- [x] 2.2 创建 `src/skills/xn-task.ts` - /xn-task 指令定义
- [x] 2.3 创建 `src/skills/xn-resume.ts` - /xn-resume 指令定义
- [x] 2.4 创建 `src/skills/xn-status.ts` - /xn-status 指令定义
- [x] 2.5 创建 `src/skills/xn-stop.ts` - /xn-stop 指令定义
- [x] 2.6 创建 `src/skills/xn-trace.ts` - /xn-trace 指令定义
- [x] 2.7 在各 Skill 中引用 Core 类型定义（如 Playbook、TargetState）
- [x] 2.8 确保 Skill 中使用 `$(xn api base)` 动态寻址

## 3. xn api base 命令

- [x] 3.1 创建 `src/commands/api.ts` 模块
- [x] 3.2 实现 `xn api base` 子命令
- [x] 3.3 修改 `src/daemon/process.ts` 启动时写入监听地址到 core.db
- [x] 3.4 修改 daemon 停止时清除 daemon_address 记录
- [x] 3.5 在 `src/cli.ts` 注册 api 命令
- [x] 3.6 实现 Core 未运行时的错误提示

## 4. OpenCode 适配器

- [x] 4.1 创建 `src/adapters/types.ts` 定义 SkillAdapter 接口
- [x] 4.2 创建 `src/adapters/opencode.adapter.ts` OpenCode 适配器
- [x] 4.3 实现 `render()` 方法生成 YAML frontmatter + Markdown
- [x] 4.4 实现 `getOutputPath()` 返回 `.opencode/skills/<id>/SKILL.md`
- [x] 4.5 实现 examples 转换为代码块
- [x] 4.6 注册 OpenCode 适配器到注册中心

## 5. 编译引擎

- [x] 5.1 创建 `src/core/skill-compiler.ts` 编译引擎
- [x] 5.2 实现 `loadSkills()` 从 TS 模块加载所有 Skill
- [x] 5.3 实现 `compileSkill()` 编译单个 Skill
- [x] 5.4 实现类型检查集成（编译前检查）
- [x] 5.5 实现内容哈希比对（增量编译）
- [x] 5.6 实现编译报告生成

## 6. xn init 扩展

- [x] 6.1 修改 `src/commands/init.ts` 支持 `--adapter` 参数
- [x] 6.2 集成 Skill 编译流程
- [x] 6.3 实现 `--force` 强制重写选项
- [x] 6.4 集成编译报告输出
- [x] 6.5 默认使用 opencode 适配器

## 7. 测试与验证

- [x] 7.1 编写 `src/skills/__tests__/types.test.ts` 接口测试
- [x] 7.2 编写 `src/adapters/__tests__/opencode.test.ts` 适配器测试
- [x] 7.3 编写 `src/core/__tests__/skill-compiler.test.ts` 编译测试
- [x] 7.4 编写 `src/commands/__tests__/api.test.ts` 命令测试
- [x] 7.5 验证编译产物格式正确（YAML frontmatter + 内容）
- [x] 7.6 验证类型检查在接口变更时报错
- [x] 7.7 验证 `xn api base` 动态寻址

## 8. 文档

- [x] 8.1 更新 README.md 添加 Skill 系统说明
- [x] 8.2 创建 `docs/skill-development.md` Skill 开发指南
- [x] 8.3 创建 `docs/adapter-development.md` 适配器开发指南
