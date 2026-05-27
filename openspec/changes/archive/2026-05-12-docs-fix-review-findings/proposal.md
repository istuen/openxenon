## Why

docs/manual 审查后残留的术语和路径问题需要清理。01/02/03 大改已完成，剩余问题集中在 05-arsenal（学术术语残留、探针命名不一致）和 06-troubleshooting（Core 旧术语、日志路径错误）。

## What Changes

- 01-intro.md: "物理观测" → "观测"
- 02-concepts.md: "二象性" → "双重视角"，"/oxn-task" → "oxn task next"
- 03-lifecycle.md: "自动超时检测（逃逸检测）" → "自动超时检测"
- 05-arsenal.md:
  - "物理落盘" → "保存"
  - "AI 降维生成" → "AI 根据约束生成"
  - "审查与确权" → "审查与转正"
  - 探针命名对齐实际（fs_content_match, exec_exit_zero → fs_match, shell_exec）
  - 目录结构描述改为实际 flat 结构
- 06-troubleshooting.md:
  - Core 日志 → Daemon 日志
  - 日志路径修正为 ~/.openxenon/daemon.log

## Capabilities

### New Capabilities
<!-- 本次仅为文档修复，无新能力 -->

### Modified Capabilities
<!-- 无规格变更，仅文档措辞修正 -->

## Impact

- docs/manual/01-intro.md
- docs/manual/02-concepts.md
- docs/manual/03-lifecycle.md
- docs/manual/05-arsenal.md
- docs/manual/06-troubleshooting.md
