## Context

### 问题背景

在探索新版 OXN DSL 的流程时，发现 Skill 文档与实际 Grammar 定义存在多处不一致：

| 问题 | Skill 文档 | 实际 Grammar |
|------|-----------|-------------|
| Blueprint 缺少 type | `blueprint "name" { }` | `blueprint "name" type "task" { }` |
| Work 使用错误关键字 | `task "name" use "bp"` | `work "name" type "task" ref "bp"` |
| PartSlot 语法错误 | `part slot "name"` | `part slot[] "name"` |
| oxn-plan 引用不存在 Blueprint | `plan-flow` | 不存在 |

### 当前状态

- **Grammar 定义** (`src/oxn-dsl/langium/oxn.langium`)：正确定义了所有语法
- **OXN DSL 测试**：172 pass, 0 fail，证明核心解析器正常工作
- **Skill 文档**：存在多处与 Grammar 不一致的错误

## Goals / Non-Goals

**Goals:**
- 修正所有 Skill 文档中的语法错误，使其与实际 Grammar 定义一致
- 确保 migrated-blueprints.oxn 中的 Blueprint 包含必需的 `type` 字段
- 验证修正后的文档可以通过 OXN 解析器正确解析

**Non-Goals:**
- 不修改 Grammar 定义（Grammar 是正确的）
- 不修改 CLI 逻辑（CLI 功能正常）
- 不添加新功能（只是修复文档一致性）

## Decisions

### Decision 1: 优先更新 Skill 文档而非 Grammar

**决定**：Skill 文档应与 Grammar 保持一致，而非相反。

**理由**：
- Grammar 是系统的基础，正确反映了设计意图
- Skill 文档是给用户看的参考材料，应该准确描述可用的语法
- 当前的 Skill 文档错误会导致用户按照文档编写代码却无法解析

### Decision 2: Blueprint 必须包含 type 字段

**决定**：所有 Blueprint 示例必须显式声明 `type` 属性。

```oxn
// 正确格式
blueprint "my-bp" type "task" {
  part slot[] "step1" { }
}

// 错误格式（文档中现有的）
blueprint "my-bp" {
  part slot "step1" { }
}
```

**理由**：
- type 是 BlueprintDeclaration 的必需属性（第131行 grammar）
- 1:1 type 校验需要此字段
- 默认值 "task" 在没有显式值时才有意义

### Decision 3: Blueprint 层支持单实例和多实例 Slot

**决定**：Blueprint 层两种 slot 声明：
- `part slot "name"` - 单实例 slot（只能被一个 Part 填充）
- `part slots[] "name"` - 多实例 slot（可被多个 Part 填充）

```oxn
blueprint "deploy" type "task" {
  part slot "prepare" {           // 单实例
    deps = []
  }
  part slots[] "worker" {         // 多实例
    deps = []
  }
}
```

**理由**：
- `slot` 语义：单一 slot
- `slots[]` 语义：slots 数组，明确表示多实例
- 与 `slot[]` 相比，`slots[]` 语义更清晰自然

### Decision 4: Work 层 SlotBinding 语法

**决定**：Work 层 SlotBinding 语法：
- `part slot "name"` - 语法糖：part name = slot name（仅用于单实例 slot）
- `part "p1" slot "name"` - 显式 part 名（用于多实例 slot 或需要明确命名）

```oxn
work "my-work" type "task" ref "@prj/bp/deploy" {
  // 单实例：使用语法糖
  part slot "prepare" { }

  // 多实例：必须显式命名
  part "worker1" slot "worker" { }
  part "worker2" slot "worker" { }
}
```

**理由**：
- 单实例时 `part slot "x"` 等价于 `part "x" slot "x"`，省略冗余
- 多实例时必须区分不同 part 实例

### Decision 5: Skill 文档必须说明使用场景

**决定**：所有 Skill 文档必须明确说明 slot 与 slots[] 的区别和使用场景。

**理由**：
- 用户需要理解为何 Blueprint 用 slots[] 而 Work 用 slot
- 避免用户混用导致解析失败
- 文档应该 teaching 而非 just reference

### Decision 6: Work 使用 `work` 关键字和 `ref` 而非 `task` 和 `use`

**决定**：oxn-task skill 必须替换 `task` → `work`，`use` → `ref`。

```oxn
// 正确格式
work "my-work" type "task" ref "@prj/blueprints/my-bp" {
  part slot "step1" { }
}

// 错误格式（oxn-task 文档中现有的）
task "my-work" use "@prj/blueprints/my-bp" {
  part slot "develop" { }
}
```

**理由**：
- `work` 是 Grammar 中定义的 TopLevelEntity（第11行）
- `task` 不存在于 Grammar 中
- `ref` 是 WorkDeclaration 的必需属性（第171行）

## Implementation Impact Analysis

### 1. Langium Grammar (`oxn.langium`)

**改动**：PartSlotDeclaration 需要支持两种语法

```langium
PartSlotDeclaration:
    'part' 'slot' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
    '}'
  | 'part' 'slots[]' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
    '}';
```

**影响**：需要重新生成 AST 代码 (`generated/ast.ts`, `generated/grammar.ts`)

### 2. AST (`ast.ts`)

**当前**：`PartSlotDeclaration` 只有 `name` 和 `deps`

```typescript
export interface PartSlotDeclaration extends langium.AstNode {
  readonly $type: 'PartSlotDeclaration'
  name: string
  deps: Array<string>
}
```

**改动**：添加 `isMulti` 字段区分单实例/多实例

```typescript
export interface PartSlotDeclaration extends langium.AstNode {
  readonly $type: 'PartSlotDeclaration'
  name: string
  deps: Array<string>
  isMulti: boolean  // 新增：true = slots[], false = slot
}
```

### 3. oxn-assembly.schema.ts

**当前**：`OxnAssemblySlotSchema` 只有 `name` 和 `deps`

```typescript
export const OxnAssemblySlotSchema = z.object({
  name: z.string().min(1),
  deps: z.array(z.string()).default([]),
})
```

**改动**：添加 `isMulti` 属性

```typescript
export const OxnAssemblySlotSchema = z.object({
  name: z.string().min(1),
  deps: z.array(z.string()).default([]),
  isMulti: z.boolean().default(false),  // 新增
})
```

### 4. blueprint-compiler.ts

**当前**：编译时通过 `part.slot` 引用 slot

**改动**：编译器需要处理 `slots[]` 的多实例语义

```typescript
// 编译时检查
if (part.slot) {
  const slotValue = raw.slots?.[part.slot]
  // 需要检查 slot 是否为多实例
  if (slotValue?.isMulti && bindings.length < 1) {
    throw new Error(`Slot "${part.slot}" requires at least one binding`)
  }
}
```

### 5. frozen.json 输出

**当前 frozen 结构**：

```json
{
  "id": "bp1",
  "name": "bp1",
  "slots": [
    { "name": "worker", "deps": [] }
  ]
}
```

**改动后**：需要包含 `isMulti` 信息

```json
{
  "id": "bp1",
  "name": "bp1",
  "slots": [
    { "name": "prepare", "deps": [], "isMulti": false },
    { "name": "worker", "deps": [], "isMulti": true }
  ]
}
```

### 影响总结

| 组件 | 影响 | 工作量 |
|------|------|--------|
| `oxn.langium` | 修改 grammar 定义 | 低 |
| `generated/ast.ts` | 重新生成，加入 isMulti | 中 |
| `generated/grammar.ts` | 重新生成 | 中 |
| `oxn-assembly.schema.ts` | 添加 isMulti 字段 | 低 |
| `blueprint-compiler.ts` | 处理多实例语义 | 中 |
| `frozen.json` | 输出格式变化 | 低 |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 修改 Skill 文档可能影响现有用户 | 提前公告修改内容，提供迁移指南 |
| 部分用户可能习惯旧语法 | 保留旧语法作为 deprecated 警告 |
| Grammar 改动可能破坏现有解析 | 先更新 test 确保向后兼容 |
| frozen.json 格式变化影响下游 | 版本号递增，兼容旧格式读取 |

## Open Questions

1. ~~oxn-plan 中引用的 `plan-flow` Blueprint 是否需要创建？~~ → 修改文档使用其他已存在的 Blueprint
2. 是否需要在解析器层面添加对旧语法格式的兼容支持？ → 暂不需要，Grammar 是唯一标准
3. slots[] 的 isMulti 字段是否需要在 frozen.json 中持久化？ → 是，用于编译时校验