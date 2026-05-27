## 1. 创建 ArsenalRegistry 数据结构

- [x] 1.1 创建 `src/daemon/registry.ts` 文件
- [x] 1.2 实现 `ArsenalEntry` 接口（name, type, state, path, semantics）
- [x] 1.3 实现 `ArsenalRegistry` 类，包含 `entries: Map<string, ArsenalEntry>`
- [x] 1.4 实现 `buildIndex()` 方法，扫描全局和项目 arsenals 目录
- [x] 1.5 实现 `search(query)` 方法，支持 name/intent/tags 模糊匹配
- [x] 1.6 实现 `getByType(type)` 方法

## 2. Daemon 集成 Registry

- [x] 2.1 在 `src/daemon/entry.ts` 中导入 `ArsenalRegistry`
- [x] 2.2 在 Daemon 初始化时调用 `registry.buildIndex()`
- [x] 2.3 验证 Daemon 启动输出包含 Registry 构建信息

## 3. 添加 IPC Handler

- [x] 3.1 在 `src/daemon/ipc/receiver.ts` 添加 `arsenal_search` handler
- [x] 3.2 在 `src/daemon/ipc/receiver.ts` 添加 `arsenal_promote` handler
- [x] 3.3 实现 Schema 校验逻辑
- [x] 3.4 实现文件重命名逻辑

## 4. 添加 trace/writer 支持

- [x] 4.1 在 `src/daemon/trace/writer.ts` 添加 `writePromoteEvent()` 方法
- [x] 4.2 实现 PROMOTE 事件的 YAML 格式化

## 5. 添加 CLI 命令

- [x] 5.1 创建 `src/cli/commands/arsenal.ts` 命令文件
- [x] 5.2 实现 `oxn arsenal search <query>` 命令
- [x] 5.3 实现 `oxn arsenal promote <asset>` 命令
- [x] 5.4 添加错误处理（Daemon 未运行、资产不存在等）

## 6. 添加 semantics 字段到现有 Arsenal

- [x] 6.1 为 `src/arsenals/probes/fs-exists/canonical.yaml` 添加 semantics
- [x] 6.2 为 `src/arsenals/probes/fs-match/canonical.yaml` 添加 semantics
- [x] 6.3 为 `src/arsenals/probes/shell-exec/canonical.yaml` 添加 semantics
- [x] 6.4 为其他现有 Arsenal 添加 semantics 字段

## 7. 验证与测试

- [x] 7.1 运行 `pnpm run build` 确保 TypeScript 编译通过
- [x] 7.2 启动 Daemon，验证 Registry 构建日志
- [x] 7.3 测试 `oxn arsenal search "fs"` 命令
- [x] 7.4 创建 draft 资产并测试 `oxn arsenal promote` 命令