---
categories:
  - Added
  - Changed
  - Removed
---

- Kernel lambda vacuum 重构
- Daemon IPC 使用 receiver.ts 和 handlers/
- CLI handlers 使用 socket-client 而非导入 daemon 模块

### Changed
- 连接 daemon executor 到 kernel evaluator
- 物理宪法 enforcement

### Removed
- 移除违反 Lambda Vacuum 的 dead kernel/probes/executor.ts