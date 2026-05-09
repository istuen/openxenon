## Why

当前 `src/daemon/ipc/handlers.ts` 通过 `import '../../cli/handlers/*'` 共享了 CLI 的代码给 Daemon。这是**物理倒灌**——CLI 和 Daemon 在运行时共享了同一套内存空间和类型推导。

**危害**：
1. Daemon 启动必须依赖 CLI 的代码上下文，无法独立部署
2. CLI 和 Daemon 之间的 IPC 变成了内存共享，失去了物理隔离的意义
3. 工程师可能忍不住传类实例而不是纯 JSON

## What Changes

1. **删除** `src/daemon/ipc/handlers.ts` 中对 `cli/handlers` 的导入
2. **建立** `src/daemon/ipc/receiver.ts` - 纯 JSON 接收器
   - 解析 Unix Socket 上的纯 JSON payload
   - 根据 payload.method 分发到相应的处理函数
   - 不共享任何 CLI 代码
3. **更新** `src/daemon/index.ts` 导入新的 receiver

## Impact

- CLI 和 Daemon 完全物理隔离
- 唯一通信协议是流过 Unix Socket 的纯 JSON
- Daemon 可以独立编译和部署

## High Risk

- 需要确保所有 CLI handlers 的功能被正确迁移到 receiver
- Socket 通信协议需要保持兼容
