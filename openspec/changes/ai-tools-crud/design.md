## Context

### 当前状态

OXN DSL 模块（`src/oxn-dsl/`）已实现读取闭环：

```
.oxn 文件 → Langium Parser → AST → oxn-adapter → FrozenBlueprint → Kernel
```

但缺少写入闭环，AI 与 DSL 的交互必须依赖生成 DSL 文本，容易引发语法错误。

### 设计目标

实现 AI 友好的结构化操作范式：

```
AI 指令 (JSON) → CLI → Infra(读) → OxnCrudProcessor → TextEdit[] → Infra(写) → .oxn 文件
```

AI 调用 `oxn add probe --to-part Nginx --data '{"type":"Http"}'` 而不是生成 DSL 文本。

## Goals / Non-Goals

**Goals:**
- AI Tools Schema 自动生成（从 `oxn.langium` 推断 + 注解补充）
- 基于 CST TextEdit 的安全 `.oxn` 文件修改
- OxnCrudService 提供结构化 CRUD 指令
- Zod 运行时校验 AI 输入参数

**Non-Goals:**
- 不支持删除/修改操作（先实现添加）
- 不重新设计 Langium AST 结构
- 不修改现有 Kernel 执行引擎

## Decisions

### Decision 1: 注解格式直接使用 JSON Schema

**选择**: 在 `oxn.langium` 源码中使用 `@oxn-ai-tool` 注解存储 JSON Schema 片段。

**原因**:
- AI 已理解 JSON Schema 标准格式，无需学习新格式
- Generator 只需正则提取 + JSON.parse，无需转换逻辑
- 保持与 AI 工具链的兼容性

**替代方案**:
- 自定义注解 DSL → 需要维护解析器，复杂度高
- 独立 JSON Schema 文件 → 两份 truth source，易产生 drift

### Decision 2: 注解仅补充额外元数据，Schema 自动推断

**选择**: `input` 字段的 JSON Schema 从 grammar 结构自动推断，注解只提供 `name`、`description`、`example`。

**原因**:
- Langium AST 类型（如 `ID`、`STRING`、`NUMBER`）可直接映射到 JSON Schema 类型
- 减少重复劳动，grammar 变化时 schema 自动同步
- 注解工作最小化

**Langium 类型 → JSON Schema 映射规则**:

| Langium 类型 | JSON Schema 类型 |
|-------------|-----------------|
| `ID` | `{ type: "string", pattern: "^[_a-zA-Z][\\w-]*$" }` |
| `STRING` | `{ type: "string" }` |
| `NUMBER` | `{ type: "number" }` |
| `boolean` | `{ type: "boolean" }` |
| `Array<T>` | `{ type: "array", items: <T> }` |
| CrossRef | `{ type: "string", format: "oxn-ref" }` |

### Decision 3: Cross-reference 使用 `format: "oxn-ref"` 标记

**选择**: Cross-reference 字段在 JSON Schema 中使用 `format: "oxn-ref"` 标记，并在 `description` 中说明引用格式。

**示例**:
```json
{
  "ref": {
    "type": "string",
    "format": "oxn-ref",
    "description": "OXN 引用格式: @scope/type/name 或 @scope/name"
  }
}
```

**原因**:
- 保持类型为 `string`，AI 调用时传入字符串即可
- `format` 字段提供语义标记，可用于校验和提示
- 不引入复杂 `$ref` 结构

### Decision 4: Generator 在 build 时执行，输出到独立目录

**选择**: Generator 在 `npm run build` 时执行，输出到 `src/oxn-dsl/ai-tools/` 目录。

**目录结构**:
```
src/oxn-dsl/
├── generated/           ← Langium 自动生成 (ast.ts, grammar.ts, module.ts)
├── ai-tools/            ← Generator 输出 (Build 产物)
│   ├── schema.json      ← AI Tools JSON Schema (给 AI 看的菜单)
│   └── validators.ts   ← Zod 校验代码 (运行时校验 AI 输入)
├── crud/                ← 手写代码 (运行时引擎)
│   └── oxn-crud-processor.ts  ← 纯逻辑：接收指令+AST，输出 TextEdit[]
└── langium/             ← oxn.langium 源码 (含注解)
```

**构建流程**:
```
npm run build
  → Langium CLI 生成 ast.ts, grammar.ts, module.ts
  → Generator 读取 oxn.langium → 生成 schema.json + validators.ts
  → tsc 编译
```

**Generator 职责边界**:
- ✅ 生成 schema.json（给 AI 看的 JSON Schema）
- ✅ 生成 validators.ts（Zod 校验代码）
- ❌ 禁止生成业务逻辑代码（如 TextEdit 计算逻辑）

**手写代码职责**:
- OxnCrudProcessor：纯计算，根据指令类型硬编码 CST 遍历和 TextEdit 生成逻辑
- 不碰 IO，通过 Infra 的 FS Port 读取文件和写回

### Decision 5: OxnCrudProcessor 是纯计算引擎，序列化逻辑手写

**选择**: OxnCrudProcessor（手写）接收结构化指令 + CST，输出 `TextEdit[]`。

序列化逻辑（JSON → DSL 文本）由手写的 `OxnSerializer` 完成，基于 Langium `AstNode` 构建。

**原因**:
- JSON 到 DSL 的转换涉及缩进、可选字段、引号等上下文，不适合模板生成
- 手写序列化逻辑虽然看似"硬编码"，但逻辑清晰、易调试、边界条件可控
- 符合"Generator 绝不生成业务逻辑"的原则

**正确的架构链路**:
```
AI 指令 → CLI (Runtime L3)
        → Infra (L1): 读取 .oxn 文件
        → OxnCrudProcessor (L0):
            1. 解析指令，定位 CST 节点
            2. 调用 OxnSerializer 将 JSON 序列化为 DSL 片段文本
            3. 计算 TextEdit[]
        → Infra (L1): 将 TextEdit 应用到文件
```

**OxnSerializer 实现方式**:
- MVP 阶段：**手写模板字符串拼接**，简单可控
  - 基于 CST 坐标计算插入点，直接 `string.substring` 拼接
  - 格式化由手写逻辑控制，不依赖 Langium 序列化器
- 进阶阶段：构建 `AstNode` 内存对象，使用 Langium 序列化器
  - 注意：Langium 序列化器不保证格式美观性，仅保证可解析

**Langium 序列化器陷阱警示**:
- Langium 内置序列化器（`AstUtils.serialize`）主要为语法图灵测试设计
- 它保证生成的文本能被重新解析，但不保证格式美观（空行、缩进、注释）
- 对于"人机共创"的 CRUD 场景，格式混乱不可接受
- 建议 MVP 阶段使用手写模板字符串拼接

### Decision 6: 注解格式（最终版）

```langium
/**
 * @oxn-ai-tool
 * {
 *   "name": "add_probe_to_part",
 *   "description": "给 Part 添加探针实例",
 *   "example": { "blueprint_name": "WebServer", "part_name": "Nginx", "probe_config": {...} }
 * }
 */
PartProbeDeclaration:
    'probe' name=ID ('ref' ref=STRING)? '{'
        ('params' '=' params=ParamsBlock)?
    '}';
```

**说明**:
- `input` schema 完全从 grammar 推断，注解只提供元数据
- `example` 可省略，Generator 自动生成最小示例
- `target` 通过 grammar 规则名推断（如 `PartProbeDeclaration` → `part_probe`）

## Risks / Trade-offs

[Risk] Generator 的 grammar 推断逻辑复杂度高
→ Mitigation: 先实现核心类型的推断（ID、STRING、NUMBER、Array），复杂类型（如 union、cross-ref）使用简化策略

[Risk] 注解的 JSON Schema 格式错误导致 build 失败
→ Mitigation: Generator 增加 JSON.parse 校验，失败时给出清晰错误信息

[Risk] Zod schema 动态生成可能导致类型推断不准确
→ Mitigation: 生成的 Zod schema 经过验证后输出，保留生成的 .ts 源码供调试

[Risk] OxnCrudProcessor 的 insert position 计算可能不准确
→ Mitigation: 使用 Langium 的 CST 精确坐标，避免手动计算行列号

[Risk] TextEdit 缩进与格式不一致
→ Mitigation: `OxnCrudProcessor` 在计算 `TextEdit` 时，必须从父节点（如 `partNode.$cstNode`）的缩进上下文中动态推导缩进量，绝不可硬编码缩进。

[Risk] 写后语法损坏导致 AI 下次调用 Parse Error
→ Mitigation:
  1. Runtime (CLI) 写回文件后触发 Langium 重新解析进行语法校验
  2. 如果解析失败，必须回滚文件写入并返回明确错误
  3. **推荐 Infra 实现**：采用"影子写入 + 原子换名"模式：
     - 读取原文件 → 在内存中应用 TextEdit → 写入 `.shadow` 临时文件
     - 对影子文件触发 Langium 内存解析（不写盘！）
     - 解析失败：删除影子文件，原文件毫发无损
     - 解析成功：`rename(shadowPath, filePath)` 原子换名（OS 级别原子操作）
     - 优势：无论何时崩溃，原文件要么是修改前状态，要么是修改后状态，绝无中间态

[Risk] OxnSerializer 初期实现复杂度
→ Mitigation: MVP 阶段采用手写映射 + 穷举匹配；当 CRUD 操作超过 5 种时再重构为 Generator 模板生成。

## Open Questions（已裁决）

1. **Build 脚本修改与执行顺序**
   **裁决**：严格串行。
   ```bash
   langium generate → ai-tools generate → tsc
   ```
   必须在 Langium 生成 AST 类型定义之后，再执行自定义 Generator。

2. **AI 调用入口**
   **裁决**：CLI 是唯一入口。AI Skill 调用 `oxn add probe ...`，CLI 解析命令并通过 Infra 组装服务。

3. **Probe params 的动态结构**
   **裁决**：在 JSON Schema 中定义为 `{ "type": "object", "additionalProperties": true }`，不做 Grammar 级别的 key 强校验。
   Key 合法性由 Kernel Validator 在运行时校验，不在 CRUD 写入阶段阻断。

4. **多个 tool 指向同一 target**
   **裁决**：不允许。一对一映射。一个 Grammar Rule 对应一个 AI Tool。

5. **Generator 的测试策略**
   **裁决**：Snapshot Testing (快照测试)。准备带有各种注解的测试文件，运行 Generator，断言输出的 schema.json 与快照完全一致。