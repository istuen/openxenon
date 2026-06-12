## Why

P0-P3 问题导致代码和文档不一致，会误导 AI 协作。必须修复后才能自举。

## What Changes

1. **P0: 修复 draft.ts getTypeFromContent**
   - `parsed.proofs` → `parsed.probes`
   - `'proofRefs:'` → `'probeRefs:'`

2. **P1: 修复 06-troubleshooting.md 残留问题**
   - `oxn task new` → `oxn task submit --blueprint`
   - `standards` → `arsenal`

3. **P2: 修复 05-arsenal.md "组合使用"示例**
   - `proofs: [string]` → `probes: ProbeRefSchema[]`

4. **P3: 修复 02-concepts.md Blueprint 示例**
   - 添加注释说明需要 BlueprintSchema 定义
   - 示例暂时保持简化

## Capabilities

### Modified Capabilities
- `kernel-schema-tests`: draft.ts 类型检测逻辑修正

## Impact

- **涉及文件**:
  - `src/cli/draft.ts` (P0)
  - `docs/manual/06-troubleshooting.md` (P1)
  - `docs/manual/05-arsenal.md` (P2)
  - `docs/manual/02-concepts.md` (P3)