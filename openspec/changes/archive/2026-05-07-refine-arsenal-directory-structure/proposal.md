## Why

OpenXenon 的 Arsenal 目录结构存在语义污染：使用 `draft/` 子目录表达状态不符合 Unix 简洁美学，`blueprint.yaml` 命名造成层级歧义（Stage 目录下放 Blueprint？）。需要纯化到"文件名即状态"的物理映射。

## What Changes

1. **消除 draft/ 子目录**：Arsenal 资产不再使用 `draft/` 子目录存放待审核状态
2. **引入 draft.yaml 命名**：AI 生成的待审核资产使用 `draft.yaml` 文件名
3. **确立 canonical.yaml 晋升规则**：`promote` 操作执行 `mv draft.yaml canonical.yaml`，物理消灭 draft 文件
4. **确立 README.md 说明文档**：每个 Arsenal 资产根目录包含 `README.md` 作为人类/AI 可读说明
5. **CLI 统一 YAML→JSON 转换边界**：CLI 在读取 YAML 后转换为 JSON 发给 Daemon

## Capabilities

### New Capabilities
- `arsenal-directory-schema`: 定义 Arsenal 资产的物理目录结构标准（README.md + canonical.yaml）
- `arsenal-draft-state`: 定义 draft.yaml 作为 AI 生成待审核资产的临时状态
- `arsenal-promote`: 定义 `mv draft.yaml canonical.yaml` 作为物理晋升机制

### Modified Capabilities
- `pure-filesystem-state`: 补充 file path 派生 state 规则：含 `canonical.yaml` → canonical 状态，含 `draft.yaml` → draft 状态

## Impact

- 影响 `src/commands/arsenal-promote.ts`：从目录 move 改为文件 mv
- 影响 `src/core/arsenals-loader.ts`：解析逻辑适配 flat structure
- 影响 `src/skills/oxn-forge.ts`：生成 `draft.yaml` 而非 `draft/blueprint.yaml`
