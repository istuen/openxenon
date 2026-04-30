## Context

当前 `oxn-forge` 接收自然语言请求，直接生成 YAML/JSON 资产。但这种方式生成的资产结构不规范，AI 需要"照着模板生成"而不是"自由发挥"。

## Goals / Non-Goals

**Goals:**
- 提供一个嵌入 Core 的元 Blueprint
- 指导 AI 按结构生成 Blueprint/Stage/Proof
- 验证生成的资产是否符合 Schema 规范

**Non-Goals:**
- 不实现复杂的模板变量替换
- 不实现生成后的自动 promote 流程
- 不实现与其他工具的集成

## Decisions

### Decision 1: 元 Blueprint 存放位置

```
src/core/blueprints/
└── meta-forge.ts  # 导出 forgeMetaBlueprint 常量
```

**选择理由：**
- 放在 `core/blueprints/` 目录下，与其他核心资产分离
- 直接导出 Blueprint 对象，供 `oxn-forge` 使用

### Decision 2: 元 Blueprint 结构

每个 Stage 的 proof 包含：

```yaml
stages:
  - id: create-blueprint
    name: 创建 Blueprint
    proof:
      target:
        description: Blueprint YAML 文件路径
        glob: ".openxenon/arsenals/**/*.yaml"
      spec:
        description: 验证 Blueprint 结构正确
        constraints:
          - 必须包含 id, name, stages
          - stages 是 Stage 数组
      probes:
        - type: fs_exists
          pattern: ".openxenon/arsenals/**/*.yaml"
```

**设计原则：**
- 每个 Stage 对应一种资产类型
- proof 的 target 描述目标文件
- proof 的 spec.constraints 描述结构要求
- probes 验证文件是否存在

### Decision 3: oxn-forge 如何使用

```typescript
// oxn-forge.ts
import { forgeMetaBlueprint } from '../core/blueprints/meta-forge'

function generateAsset(type: 'Blueprint' | 'Stage' | 'Proof') {
  const stage = forgeMetaBlueprint.stages.find(s => s.id === `create-${type.toLowerCase()}`)
  // 使用 stage 的 spec.constraints 作为生成提示
}
```

## Risks / Trade-offs

- [风险] 元 Blueprint 过于简单，无法覆盖复杂场景
  - [缓解] 初期只支持简单场景，后续可扩展

## Open Questions

- 无