## 1. 实现 ExecutionPolicy Strategy 模式

- [x] 1.1 创建 `src/core/execution-policy.ts` 定义 Policy 接口和 Action 枚举
- [x] 1.2 实现 `ProductionPolicy` 类（熔断删除、严格雷达、禁止 draft）
- [x] 1.3 实现 `SandboxPolicy` 类（警告保留、静默雷达、允许 draft）
- [ ] 1.4 修改 `task-executor.ts` 根据 space.oxn 的 mode 注入不同 Policy

## 2. 修改 space.oxn 初始化逻辑

- [x] 2.1 修改 `oxn init` 在 space.oxn 创建 config 表
- [x] 2.2 修改 `oxn init --sandbox` 插入 `('mode', 'SANDBOX')`
- [x] 2.3 实现 `getConfig(key)` 和 `setConfig(key, value)` 辅助函数

## 3. 实现 arsenal export 命令

- [x] 3.1 创建 `src/commands/arsenal-export.ts`
- [x] 3.2 实现 `--draft/--canonical/--all/--archive` 过滤
- [x] 3.3 实现目录结构和文件复制逻辑

## 4. 实现 arsenal import 命令

- [x] 4.1 创建 `src/commands/arsenal-import.ts`
- [x] 4.2 实现 `--draft/--canonical/--all/--archive` 过滤
- [x] 4.3 实现已存在文件跳过逻辑
- [x] 4.4 实现 `--force` 覆盖逻辑

## 5. 更新 arsenal 父命令

- [x] 5.1 更新 `src/commands/arsenal.ts` 注册 export/import 子命令
- [x] 5.2 更新 `src/cli.ts` 确保 arsenal 命令正确加载

## 6. 测试验证

- [x] 6.1 测试 `oxn init --sandbox` 生成 mode: "SANDBOX"
- [ ] 6.2 测试沙箱模式下 probe 失败仅警告不删除
- [ ] 6.3 测试沙箱模式下雷达静默
- [x] 6.4 测试 `oxn arsenal export /path --all`
- [x] 6.5 测试 `oxn arsenal import /path --force` 覆盖行为