## 1. P0: 修复 draft.ts

- [x] 1.1 修改 `parsed.proofs` → `parsed.probes`
- [x] 1.2 修改字符串匹配 `'proofRefs:'` → `'probeRefs:'`
- [x] 1.3 修改字符串匹配 `'proofs:'` → `'probes:'`
- [x] 1.4 运行 `pnpm test` 验证

## 2. P1: 修复 06-troubleshooting.md

- [x] 2.1 将 `oxn task new` 替换为 `oxn task submit --blueprint`
- [x] 2.2 将 `standards` 替换为 `arsenal`

## 3. P2: 修复 05-arsenal.md

- [x] 3.1 将 `proofs: [string]` 改为 `probes: ProbeRefSchema[]`

## 4. P3: 修复 02-concepts.md

- [x] 4.1 添加 Blueprint 示例注释说明 BlueprintSchema 未定义

## 5. 验证

- [x] 5.1 运行 `pnpm typecheck`
- [x] 5.2 运行 `pnpm test`
- [x] 5.3 确认所有 38 个测试通过