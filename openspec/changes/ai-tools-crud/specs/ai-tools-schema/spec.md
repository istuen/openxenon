# AI Tools Schema (ai-tools-schema)

## ADDED Requirements

### Requirement: 从 oxn.langium 推断 AI Tools JSON Schema

Generator SHALL 从 `oxn.langium` 源码自动推断 AI Tools JSON Schema。

推断规则：

| Langium 语法类型 | JSON Schema 类型 |
|----------------|-----------------|
| `ID` | `{ type: "string", pattern: "^[_a-zA-Z][\\w-]*$" }` |
| `STRING` | `{ type: "string" }` |
| `NUMBER` | `{ type: "number" }` |
| `boolean` 字面量 | `{ type: "boolean" }` |
| `Array<T>` | `{ type: "array", items: <T> }` |
| Cross-reference | `{ type: "string", format: "oxn-ref", description: "OXN 引用格式: @scope/type/name" }` |

### Requirement: 注解扩展元数据合并

Generator SHALL 提取 `@oxn-ai-tool` 注解中的 `name`、`description`、`example` 字段，与自动推断的 schema 合并。

注解格式：
```json
{
  "name": "add_probe_to_part",
  "description": "给 Part 添加探针实例",
  "example": { ... }
}
```

### Requirement: 自动生成最小示例

当注解中缺少 `example` 时，Generator SHALL 自动生成最小示例。

生成规则：
- `string` 类型字段：使用字段名作为示例值
- `number` 类型字段：使用 `0` 或 `1`
- `boolean` 类型字段：使用 `true`
- `object` 类型字段：递归生成每个字段的最小值

### Requirement: JSON Schema 输出格式

Generator SHALL 输出符合 JSON Schema Draft-07 标准的 schema：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "add_probe_to_part": {
      "type": "object",
      "properties": { ... },
      "required": ["blueprint_name", "part_name", "probe_config"]
    }
  }
}
```

### Requirement: Cross-reference 格式说明

Cross-reference 字段 SHALL 添加 `format: "oxn-ref"` 和 `description` 说明引用格式：

```json
{
  "ref": {
    "type": "string",
    "format": "oxn-ref",
    "description": "OXN 引用格式: @scope/type/name 或 @scope/name"
  }
}
```

## 技术约束

- Generator 在 `npm run build` 时执行
- 输入：`src/oxn-dsl/langium/oxn.langium` 源码
- 输出：`src/oxn-dsl/ai-tools/schema.json`