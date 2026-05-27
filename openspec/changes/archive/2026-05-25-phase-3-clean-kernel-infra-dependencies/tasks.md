- [x] 1.1 检查 `kernel/schemas/probe.ts` 是否已有 `ProbeTypeSchema` 定义 — 确认只有 import from infra
- [x] 1.2 如缺失，创建定义 — 将 ProbeTypeSchema 定义迁入 kernel/schemas/probe.ts

## 2. 迁移引用解析函数

- [x] 2.1 检查 `kernel/probes/namespace.ts` 当前实现 — 确认为 re-export from infra
- [x] 2.2 将 `isValidProbeRef`, `isBareProbeRef`, `parseProbeNamespace` 移至 `kernel/probes/namespace.ts` — 按 design 保持源位置在 infra，在 kernel 提供直接定义
- [x] 2.3 移除 `kernel/probes/namespace.ts` 对 `infra/loader.ts` 的 re-export — 改为本地图入

## 3. 更新 import 路径

- [x] 3.1 更新 `kernel/schemas/part-asset.ts` 的 import（从本地图入，非 infra）
- [x] 3.2 更新 `kernel/schemas/blueprint.schema.ts` 的 import（从本地图入，非 infra）

## 4. 验证

- [x] 4.1 运行 `bun test` 确保所有测试通过
- [x] 4.2 运行 `bun run typecheck` 确保无类型错误
- [x] 4.3 确认无 `kernel/` 文件导入 `infra/` — `part-resolver.ts` 仍有 `loadStandardByName` 从 infra（I/O 操作，正确分层，待后续 Work 层注入改造）