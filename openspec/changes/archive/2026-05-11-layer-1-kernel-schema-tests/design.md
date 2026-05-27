## Context

当前状态：
- `tests/` 目录不存在，无任何测试
- `src/kernel/schemas/` 已有 Probe、Proof、Stage 的 Definition/Invocation Schema
- Bun test 已配置但无可执行测试

测试是唯一可信的 ground truth：
- Zod schema 的 `parse()` 要么通过要么抛异常，无歧义
- 测试用例可直接验证 Schema 行为

## Goals / Non-Goals

**Goals:**
- 创建 `tests/kernel/schemas/` 测试基础设施
- 每个 Schema 的 Definition 和 Invocation 格式都有测试覆盖
- 交叉验证：Definition 和 Invocation 格式互拒绝
- 用测试结果驱动 Schema 修正

**Non-Goals:**
- 不写 CLI 集成测试（那是 Layer 2）
- 不修文档（那是 Layer 1 测试通过后才做的事）
- 不实现新功能（纯测试基础设施建设）

## Decisions

1. **测试框架：Bun test**
   - Bun 原生支持，无需额外配置
   - `package.json` 已有 `"test": "bun test"`
   - TypeScript + Bun 天然兼容

2. **测试文件命名**
   - `tests/kernel/schemas/probe.test.ts`
   - `tests/kernel/schemas/proof.test.ts`
   - `tests/kernel/schemas/stage.test.ts`

3. **测试结构：每个 Schema 四个维度**
   ```
   Schema 测试四维度：
   ├── 合法 Definition → 应通过
   ├── 非法 Definition（缺字段/多余字段）→ 应抛异常
   ├── 合法 Invocation → 应通过
   └── 合法 Definition + Invocation 交叉 → 应抛异常（格式互斥）
   ```

4. **Schema 修正优先级**
   - 测试暴露问题 → 优先改 Schema 还是改测试？
   - 决策：如果 Schema 明显有 bug（如应该 required 但 optional），改 Schema
   - 决策：如果 Schema 符合设计意图，调整测试期望

## Risks / Trade-offs

- **风险**：Schema 设计可能本身就有问题
  -  Mitigation：测试只验证行为，不假设正确性；发现问题时记录并提出修改建议

- **风险**：测试通过不代表 CLI 正确
  -  Mitigation：Layer 1 测试通过后，才进入 Layer 2 CLI 集成测试

- **权衡**：先写测试还是先修 Schema？
  -  决策：先用现有 Schema 写测试，让测试暴露问题

## Open Questions

1. `StageDefinitionSchema.proof` 是 `string` 类型，但 reviewer 暗示应该是 structured？
   - 待测试验证：如果 Blueprint 里引用 Stage，proof 应该是什么格式？

2. `ParameterDefSchema.description` 是 required，但文档说"定义格式允许无描述的参数"？
   - 测试会给出答案

3. Proof 的 Definition/Invocation 区分是否和 Probe 一样清晰？
   - 待测试验证