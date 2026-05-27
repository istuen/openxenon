## 1. 修改 StageDefinitionSchema (stage.ts)

- [x] 1.1 在 `StageDefinitionSchema` 中添加 `description: z.string()` 字段

## 2. 修改 ProofDefinitionSchema (proof.ts)

- [x] 2.1 创建 `ProbeRefSchema` 结构
- [x] 2.2 将 `ProofDefinitionSchema.probes` 从 `z.array(z.string())` 改为 `z.array(ProbeRefSchema)`

## 3. 修改 ParameterDefSchema (probe.ts)

- [x] 3.1 将 `description` 从 `z.string().optional()` 改为 `z.string()`

## 4. 验证

- [x] 4.1 `pnpm run typecheck` ✓
- [x] 4.2 `pnpm run build` ✓
- [x] 4.3 `oxn init -f` 重新编译 ✓