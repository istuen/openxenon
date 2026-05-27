# OXN AI Annotation (oxn-ai-annotation)

## ADDED Requirements

### Requirement: 注解语法格式

`oxn.langium` 源码中的 AI tool 注解 SHALL 使用以下格式：

```langium
/**
 * @oxn-ai-tool
 * {
 *   "name": "add_probe_to_part",
 *   "description": "给 Part 添加探针实例",
 *   "example": { ... }
 * }
 */
PartProbeDeclaration:
    'probe' name=ID ('ref' ref=STRING)? '{'
        ('params' '=' params=ParamsBlock)?
    '}';
```

**注解字段定义**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | AI tool 名称，英文唯一标识 |
| `description` | string | 是 | 人类可读描述 |
| `example` | object | 否 | 示例负载，Generator 可自动生成 |

### Requirement: 注解位置规范

- 注解必须位于 grammar rule 的 JSDoc 注释中
- 注解与对应的 grammar rule 之间不允许有其他内容
- 每个 grammar rule 最多一个 `@oxn-ai-tool` 注解

**示例**：

```langium
/**
 * @oxn-ai-tool
 * {
 *   "name": "add_probe_to_part",
 *   "description": "给 Part 添加探针实例"
 * }
 */
PartProbeDeclaration:
    'probe' name=ID ...
```

### Requirement: 注解解析规则

Generator SHALL 使用以下规则解析注解：

1. **提取**：正则匹配 `@oxn-ai-tool\n* {` 开始到匹配的 `}` 结束
2. **JSON 解析**：将提取的 JSON 字符串用 `JSON.parse` 解析
3. **校验**：校验必填字段 `name` 和 `description` 存在
4. **错误处理**：解析失败时给出清晰错误信息（含行号）

### Requirement: Input Schema 自动推断

注解中的 `input` JSON Schema SHALL 从 grammar 结构自动推断：

- 不在注解中显式声明 `input` 字段
- Generator 根据 grammar rule 的属性自动映射到 JSON Schema
- `name`、`description`、`example` 只作为元数据补充

推断逻辑：
- `name=ID` → `{ type: "string" }`
- `ref=STRING` → `{ type: "string" }`
- `params=ParamsBlock` → `{ type: "object", additionalProperties: { type: "string" } }`

### Requirement: 注解与 Grammar 同步

当 `oxn.langium` 的 grammar 结构变化时，Generator SHALL 自动重新生成正确的 schema。

**原因**：
- `input` schema 完全从 grammar 推断，不在注解中声明
- 注解只提供元数据（name、description、example）
- Grammar 变化时，生成的 schema 自动同步

### Requirement: Tool Target 推断

Tool 的 `target` SHALL 从 grammar rule 名称推断：

| Grammar Rule | Inferred Target |
|--------------|----------------|
| `PartProbeDeclaration` | `part_probe` |
| `PartDeclaration` | `part` |
| `BlueprintDeclaration` | `blueprint` |
| `ProbeDeclaration` | `probe` |

推断规则：小写 + 下划线转中划线 + 移除 `Declaration` 后缀

## 技术约束

- 注解格式兼容 JSON Schema Draft-07
- Generator 使用正则 + JSON.parse 解析注解
- 注解解析失败应终止 build 并给出清晰错误