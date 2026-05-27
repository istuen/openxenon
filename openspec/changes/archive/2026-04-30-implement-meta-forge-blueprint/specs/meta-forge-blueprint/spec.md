# Forge Meta Blueprint 规范

## Overview

`meta-forge-blueprint` 是一个元 Blueprint，嵌入 Core 内部，供 `oxn-forge` 使用。它的作用是指导 AI 按结构生成标准资产（Blueprint、Stage、Proof）。

## Schema

### Blueprint

```yaml
id: meta-forge
name: Forge Meta Blueprint
status: CANONICAL
stages:
  - id: create-blueprint
    name: 创建 Blueprint
    deps: []
    proof:
      target:
        description: Blueprint YAML 文件
        glob: "**/*.yaml"
      spec:
        description: 验证 Blueprint YAML 结构
        constraints:
          - 必须包含 id, name, stages
          - stages 必须是数组
          - 每个 stage 必须包含 id, name, proof
      probes:
        - type: fs_exists
          pattern: "**/*.yaml"

  - id: create-stage
    name: 创建 Stage
    deps: []
    proof:
      target:
        description: Stage YAML 文件
        glob: "**/*.yaml"
      spec:
        description: 验证 Stage YAML 结构
        constraints:
          - 必须包含 id, name, proof
          - proof 必须包含 target, spec, probes
          - deps 必须是字符串数组
      probes:
        - type: fs_exists
          pattern: "**/*.yaml"

  - id: create-proof
    name: 创建 Proof
    deps: []
    proof:
      target:
        description: Proof YAML 文件
        glob: "**/*.yaml"
      spec:
        description: 验证 Proof YAML 结构
        constraints:
          - 必须包含 target, spec, probes
          - target 必须包含 description
          - spec 必须包含 description
          - probes 必须是数组
      probes:
        - type: fs_exists
          pattern: "**/*.yaml"
```

## Constraints 说明

### create-blueprint Stage

生成 Blueprint 时，AI 必须确保：
- 顶层必须包含 `id` 和 `name`
- `stages` 是非空数组
- 每个 stage 对象包含 `id`, `name`, `proof`

### create-stage Stage

生成 Stage 时，AI 必须确保：
- 必须包含 `id`, `name`, `proof`
- `proof` 是四元组结构：`target`, `spec`, `probes`
- `deps` 可选，默认为空数组

### create-proof Stage

生成 Proof 时，AI 必须确保：
- 必须包含 `target`, `spec`, `probes`
- `target` 必须有 `description`
- `spec` 必须有 `description`
- `probes` 是 Probe 对象数组

## Usage

`oxn-forge` 调用方式：

```typescript
import { forgeMetaBlueprint } from '../core/blueprints/meta-forge'

const type = 'Blueprint' // or 'Stage' or 'Proof'
const stage = forgeMetaBlueprint.stages.find(s => s.id === `create-${type.toLowerCase()}`)

// stage.proof.spec.constraints 包含生成约束
// AI 在生成时必须遵循这些约束
```

## File Location

```
src/core/blueprints/
└── meta-forge.ts  # 导出 forgeMetaBlueprint 对象
```