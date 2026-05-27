## Why

当前系统已有多个内置 fs* Proof（fs_exists, fs_not_exists, fs_content_match, fs_parseable），但缺少预定义的 Stage 配置。用户需要手动创建 Stage 并配置 Proof，缺乏开箱即用的默认阶段模板。通过基于现有 fs* Proof 创建默认 Stage，可以加速文件系统验证工作流的配置。

## What Changes

- 新增基于内置 fs* Proof 的默认 Stage 模板（4 个）
- 提供文件系统验证场景的预配置 Stage
- 支持用户快速引用这些默认 Stage

## Capabilities

### New Capabilities
- `default-stage-templates`: 基于现有 fs* 内置 Proof 创建可复用的默认 Stage 模板：
  - `default:fs_exists` - 检查文件或目录是否存在
  - `default:fs_not_exists` - 检查文件或目录是否不存在
  - `default:fs_content_match` - 检查文件内容是否包含指定文本
  - `default:fs_parseable` - 检查文件是否可解析为指定格式

### Modified Capabilities
- 无

## Impact

- 新增 `src/core/stage/default-stages.ts` 或类似文件
- 可能需要扩展 Stage 类型定义以支持模板引用
