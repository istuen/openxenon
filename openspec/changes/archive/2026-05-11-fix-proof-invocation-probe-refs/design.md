## Context

**当前问题**：
- `ProofInvocationSchema.probeRefs: z.array(z.string())` - 只有 Probe 名字
- 当 Daemon 执行 ProofInvocation 时，不知道 `fs_exists` 的 `path` 参数是什么

**相关 Schema**：
```
ProbeInvocationSchema:     (invocation - 带参数)
  type: enum
  params: { path } | { path, pattern } | { command }

ProbeDefinitionSchema:    (definition - 模板)
  type: enum
  description: string
  parameters: array of { name, type, description }
```

## Goals / Non-Goals

**Goals:**
- ProofInvocation.probeRefs 可以包含完整 ProbeInvocation（带参数）
- Layer 1 测试验证新行为

**Non-Goals:**
- 不修改 ProbeDefinitionSchema.probes 结构
- 不修改 Daemon 执行逻辑（那是 Layer 2）

## Decisions

1. **改变 `probeRefs` 类型**
   ```
   当前: probeRefs: z.array(z.string())
   修改: probeRefs: z.array(ProbeInvocationSchema)
   ```

2. **保持与 Definition 的区分**
   ```
   ProofInvocation.probeRefs:  内联 ProbeInvocation (type + params)
   ProofDefinition.probes:    ProbeRefSchema[] (ref + description + params)
   ```
   这两者结构不同但互补：
   - Definition: 模板，包含参数定义
   - Invocation: 实例，包含实际参数

## Risks / Trade-offs

- **风险**: **BREAKING CHANGE** - 现有 Blueprint 中的 `probeRefs: ['name']` 会报错
  -  Mitigation: 需要迁移脚本或文档说明

- **权衡**: probeRefs 用 string[] 还是 ProbeInvocationSchema[]？
  -  选择: ProbeInvocationSchema[] - 语义更完整，执行时不需要再查 Definition

## Open Questions

1. Daemon 执行时如何处理 probeRefs？
   - 当前：probeRefs 只是名字，执行时查 Definition 获取参数
   - 修改后：probeRefs 内联参数，可以直接执行
   - 需要确认 Daemon 代码是否已准备好使用新格式