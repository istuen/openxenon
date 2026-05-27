## Context

`oxn forge probe -s` 命令接受用户输入的 Probe 定义，但 `createDraftProbe` 函数使用 `JSON.parse()` 解析输入。用户在 CLI 中传入 YAML 时会失败。

## Goals / Non-Goals

**Goals:**
- 支持 YAML 格式的 Probe 定义输入
- 保持向后兼容（JSON 仍可使用）

**Non-Goals:**
- 不修改 Probe 的 Zod Schema 验证逻辑
- 不改变文件存储格式

## Decisions

**解析策略：优先 JSON，失败后降级到 YAML**

```
输入内容
    │
    ▼
JSON.parse()
    │
    ├── 成功 → validateProbeDefinition
    │
    └── 失败 → YAML.parse() → validateProbeDefinition
```

**备选方案：使用 --format 显式指定**
- 用户体验差，需要额外参数
- 降级策略更自然

## Risks / Trade-offs

无显著风险，仅增加解析灵活性。
