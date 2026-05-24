---
categories:
  - Added
  - Changed
  - Fixed
---

- Arsenal list 显示 stages 并支持类型/来源过滤
- 内置资产 fallback，Skills 去除 daemon 引用

### Changed
- 更新 README 和 architecture.md 到 0.1 探索模式
- 移除学术术语，使用通俗工程语言

### Fixed
- 支持 oxn forge probe -s 使用 YAML 格式
- 支持 oxn arsenal inspect 使用 <type>/<name> 格式
- 接受 fs_exists/fs_not_exists probes 的 params.path 和 params.pattern