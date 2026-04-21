## 1. 目录名迁移 (.xenonix → .openxenon)

- [x] 1.1 更新 `src/core/global.ts` - GLOBAL_BOUNDARY_PATH
- [x] 1.2 更新 `src/core/project.ts` - PROJECT_BOUNDARY_PATH
- [x] 1.3 更新 `src/core/custom-proofs-scanner.ts` - 目录引用
- [x] 1.4 更新 `src/core/proof-dispatcher.ts` - 目录引用
- [x] 1.5 更新 `src/api/context.ts` - 目录引用

## 2. 数据库文件迁移 (.db → .oxn)

- [x] 2.1 更新 `src/core/global.ts` - core.db → core.oxn
- [x] 2.2 更新 `src/core/project.ts` - project.db → project.oxn
- [x] 2.3 更新 `src/api/context.ts` - project.db → project.oxn

## 3. CLI 命令迁移 (xn → oxn)

- [x] 3.1 更新 `package.json` - bin: xn → oxn
- [x] 3.2 更新 `src/skills/xn-init.ts` - 文档
- [x] 3.3 更新 `src/skills/xn-task.ts` - 文档
- [x] 3.4 更新 `src/skills/xn-resume.ts` - 文档
- [x] 3.5 更新 `src/skills/xn-status.ts` - 文档
- [x] 3.6 更新 `src/skills/xn-trace.ts` - 文档
- [x] 3.7 更新 `src/skills/xn-stop.ts` - 文档

## 4. Skills 文件重命名

- [x] 4.1 重命名 `src/skills/xn-init.ts` → `src/skills/oxn-init.ts`
- [x] 4.2 重命名 `src/skills/xn-task.ts` → `src/skills/oxn-task.ts`
- [x] 4.3 重命名 `src/skills/xn-resume.ts` → `src/skills/oxn-resume.ts`
- [x] 4.4 重命名 `src/skills/xn-status.ts` → `src/skills/oxn-status.ts`
- [x] 4.5 重命名 `src/skills/xn-trace.ts` → `src/skills/oxn-trace.ts`
- [x] 4.6 重命名 `src/skills/xn-stop.ts` → `src/skills/oxn-stop.ts`

## 5. 验证

- [x] 5.1 更新 `src/commands/daemon.ts` - 提示信息
- [x] 5.2 运行 typecheck 验证
- [x] 5.3 运行测试验证
- [x] 5.4 更新测试文件引用