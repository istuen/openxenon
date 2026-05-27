## Why

Blueprint 中的 `ref` 引用是「浮动链接」，如果 Arsenal 升级，三个月前成功执行的 Task 可能因资产语义变化而复现失败。这违反了 OpenXenon 「工程案卷不可篡改」的核心公理。

## What Changes

- `oxn task submit` 时执行深度内联展开
- 所有外部引用（Stage/Probe）物理深拷贝进 `blueprint.frozen.yaml`
- 注入 `_xenon_meta` 元数据块（记录 ref, shadow, content_hash, frozen_at）
- frozen.yaml 写入 `.openxenon/tasks/<task_id>/`
- 运行时 Core 只读 frozen 文件，不再访问 Arsenal
- 血缘报告在 submit 时打印给人类审查

## Capabilities

### New Capabilities

- `blueprint-freezing`: 提交时深度冻结机制
- `frozen-yaml-schema`: blueprint.frozen.yaml 的 schema 定义
- `xenon-meta-injection`: _xenon_meta 元数据烙印
- `lineage-report`: 血缘报告输出

### Modified Capabilities

（无现有 spec 可修改，v0.1.0 全新设计）

## Impact

- Task 执行时的 Blueprint 解析逻辑
- `src/kernel/` 下的 Blueprint 解析器
- `.openxenon/tasks/` 目录结构
- `oxn task submit` / `oxn task trace` 命令