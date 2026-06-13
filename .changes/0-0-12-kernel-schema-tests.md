---
categories:
  - Added
  - Changed
  - Fixed
---

- Layer 1 Kernel Schema 测试
- 基于文件的配置和纯文件系统状态规格

### Changed
- 从核心模块移除数据库引用
- 更新 handlers 使用追加-only task-trace 和原子 manifest
- 更新 runtimes、server、skills 为纯文件系统架构

### Fixed
- 对齐代码和文档与当前 Schema
- ProofInvocationSchema.probeRefs 现在接受 ProbeInvocation[]