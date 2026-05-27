## Context

`oxn arsenal list` 当前存在两个问题：

**问题 1：stages 不显示**

stages 目录结构是 `.openxenon/arsenals/stages/<name>/canonical.yaml`，而 loader 的 `scanNewStructure` 查找路径是 `{projectBoundary}/arsenals/stages/<name>/canonical.yaml`。

`.openxenon/arsenals/stages/` 中 stages 目录与 loader 要查找的 `stages` 子目录重叠，导致 `readdirSync` 扫描时将 stages 目录本身当作资产处理，而非目录容器。

**问题 2：无类型过滤**

`oxn arsenal list` 不支持按类型（probe/proof/stage/blueprint）过滤。用户无法快速查看特定类型的资产。

## Goals / Non-Goals

**Goals:**
- `oxn arsenal list` 正确显示 stages 资产
- 增加 `--type` 参数支持按类型过滤
- 增加 `--scope` 参数支持按来源过滤（project/global/builtin）

**Non-Goals:**
- 不修改 loader 的核心路径逻辑（只修复扫描重叠问题）
- 不支持复合类型过滤（如 `--type probe,proof`）

## Decisions

### Decision 1：修复 stages 扫描重叠

**问题根因**：`scanNewStructure` 中 `typePath = join(projectBoundary, 'arsenals', type)` 对 stages 类型来说：
- `type = 'stages'`
- `typePath = .openxenon/arsenals/stages`
- `readdirSync` 扫描这个目录，得到 `['git-commit', 'run-build-and-test', ...]`
- 对每个条目，如果不是目录则跳过——但这些已经是资产目录了

**解决方案**：stages 目录扫描需要特殊处理——直接读取 `canonical.yaml` 或 `draft.yaml`，而不是作为子目录扫描。

实际上，问题在于 stages 的存储结构是 `stages/<name>/canonical.yaml`，与 loader 期望的 `stages/<state>/<name>.yaml` 不同。

当前 loader 支持两种结构（旧和新）：
- 旧：`stages/<state>/<name>.yaml`
- 新：`stages/<name>/canonical.yaml`

但实际上 `scanNewStructure` 只处理新结构，且没有正确处理 stages 目录的特殊性。

### Decision 2：增加 `--type` 参数

在 `arsenal-list.ts` 中添加 `--type` 参数，值可以是 `probe`、`proof`、`stage`、`blueprint`。

当指定 `--type` 时，只调用 `listStandards(state, scope).filter(a => a.type === type)`。

### Decision 3：增加 `--scope` 参数

在 `arsenal-list.ts` 中添加 `--scope` 参数，值可以是 `project`、`global`、`builtin`、`fallback`（默认）。

当指定 `--scope` 时，直接传递给 `listStandards(state, scope)`。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| stages 修复可能影响其他类型扫描 | 只修改 stages 的扫描逻辑，保持 probes/proofs/blueprints 不变 |
| type 和 scope 参数组合可能返回空 | 正常行为，告知用户无匹配资产 |

## Open Questions

无。设计清晰，可以开始实现。