## Why

当前 `oxn-forge` 通过自然语言生成资产，但缺乏结构化的 Blueprint 指导 AI 生成符合规范的 Blueprint/Stage/Proof。需要一个元 Blueprint 嵌入 Core，作为 AI 生成标准资产的"模板引擎"。

## What Changes

设计并实现一个元 Blueprint (`meta-forge-blueprint`)，嵌入 Core 内部，供 `oxn-forge` 使用：

### 元 Blueprint 结构

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
          - probes 必须是数组
      probes:
        - type: fs_exists
          pattern: "**/*.yaml"
```

## Capabilities

### New Capabilities
- `meta-forge-blueprint`: 内置于 Core 的元 Blueprint，用于指导 AI 生成标准资产

## Impact

- 影响文件：`src/core/blueprints/meta-forge.ts`
- `oxn-forge` 调用此 Blueprint 生成资产
- AI 生成的资产更加结构化、符合规范