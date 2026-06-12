## 1. 项目名迁移

- [x] 1.1 更新 `package.json` - name: xenonix → openxenon
- [x] 1.2 更新 `package.json` - description

## 2. 接口名迁移

- [x] 2.1 更新 `src/skills/types.ts` - XenonixSkill → OpenXenonSkill
- [x] 2.2 更新 `src/skills/index.ts` - 导出引用

## 3. 代码迁移

- [x] 3.1 更新 `src/core/skill-compiler.ts` - 类型引用
- [x] 3.2 更新 `src/adapters/opencode.adapter.ts` - 类型引用
- [x] 3.3 更新 `src/adapters/types.ts` - 类型引用
- [x] 3.4 更新 `src/cli.ts` - description
- [x] 3.5 更新 `src/server.ts` - 日志
- [x] 3.6 更新 `src/commands/daemon.ts` - 日志输出

## 4. Skills 文档迁移

- [x] 4.1 更新 `src/skills/oxn-init.ts` - 文档
- [x] 4.2 更新 `src/skills/oxn-task.ts` - 文档

## 5. 验证

- [x] 5.1 运行 typecheck 验证
- [x] 5.2 运行测试验证