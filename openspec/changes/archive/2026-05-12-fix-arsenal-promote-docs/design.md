## Context

`oxn arsenal promote` 命令接受 `<type>/<name>` 格式的位置参数，但文档示例使用了 `<asset-path>` 等不正确的格式。

## Goals / Non-Goals

**Goals:**
- 统一所有文档中 `oxn arsenal promote` 的使用示例

**Non-Goals:**
- 不修改 CLI 代码
- 不改变命令签名

## Decisions

统一使用 `<type>/<name>` 格式：

| 文档位置 | 修改内容 |
|---------|---------|
| 04-cli-ref.md | `<asset-path>` → `<type>/<name>` |
| README.md | `<path>` → `<type>/<name>` |
| 05-arsenal.md | 完整路径 → `<type>/<name>` |
| 03-lifecycle.md | 保持流程描述不变 |

## Risks / Trade-offs

无风险，纯文档修正。
