# Proof Probe Per-Description + Target + extractTarget Bug Fix

> **状态**：📝 Draft（评审中，未执行）
> **日期**：2026-08-01
> **来源**：2026-08-01 Proof-First 实例 demo（demo-proof-first）审查
> **关联**：RFC-0015 D1（产物命名）/ RFC-0015 D2.1（Taint 接入已执行）/ RFC-0015 D3.1（注册表死表未执行）

## 1. Context（触发问题）

创建 Proof-First 实例（`demo-proof-first`）并跑完 `oxn proof run` 后，审查生成的 3 个产物文件（proof.md / frozen.json / outcome.md），发现两个产品认知层问题：

### 问题 1：probe 声明只有序号，无语义

proof.md 当前结构：
```markdown
## Probes

### p1                          ← 无语义的序号
- ref: @oxn/probes/fs-exists
- params:
  - pattern: ./package.json
```

工程师看到 `p1` 无法回答：**验证什么产物？为什么验证？预期结果是什么？**

### 问题 2：outcome.md Evidence 不显示验证目标

outcome.md 当前 Evidence 段：
```
- ✅ **p1** `@oxn/probes/fs-exists` (COMPLETED, 1ms)
- ❌ **p4** `@oxn/probes/git-clean` (DEVIATED, 31ms)
```

工程师无法看到：验证的产物是什么（应显示 `./package.json`），验证意图是什么（应显示"确认 package.json 存在"）。

## 2. 根因分析（3 层）

### 2.1 缺字段：per-probe 没有 description/target

- `ProofProbeIR` 类型（`packages/engine/src/oxl/md-pipeline/transformers/proof.ts:12-16`）只有 `probeName`/`ref`/`params`
- `extractProbeFromFields`（:71-89）只读 `ref` 和 `params`，其他字段静默丢弃
- `FrozenProofProbeResult` schema（`packages/engine/src/kernel/schemas/proof-schema.ts:35-48`）无 `description`/`target` 字段
- `probe add` CLI（`packages/cli/src/commands/proof.ts:496-593`）写 proof.md 时只写 `ref` + `params`，无 description/target 选项

**`--probeName` 参数已存在**（proof.ts:509）但默认自动生成 p1/p2/p3...（proof.ts:595-603 `nextProbeName`）。

### 2.2 `## Description` 是 whole-proof 级，不是 per-probe

proof.md 的 `## Description` 段（proof.ts:368-381 模板）只有一个 `### primary` + `- value:`，对应 `ProofIR.description`（transformers/proof.ts:18-26 的顶层字符串），不是 per-probe 描述。

### 2.3 extractTarget bug：outcome.md Evidence 行永远不显示 target

`packages/engine/src/Proof/outcome-writer.ts:177-194` 的 `extractTarget` 在**错误的层级**查找：

```typescript
function extractTarget(probe: FrozenProofProbeResult): string | undefined {
  const output = probe.output
  // ...
  const obj = output as Record<string, unknown>
  const candidates = [obj.params, obj.target, obj.path, obj.url, obj.command, obj.file]
  // ↑ 错误：output 是 {observation, outcome}，不是 {params, target, path, ...}
  //   所以 candidates 全部 undefined → 返回 undefined
}
```

实际数据形状（runner.ts:118）：
```typescript
output: { observation: {...}, outcome: { passed, params: { pattern: '...' }, ... } }
```

params 在 `output.outcome.params`，但 extractTarget 在 `output` 顶层找 `params`，**永远找不到**。

**唯一正确的实现**在 `packages/engine/src/kernel/verdicts/extraction.ts:16-25`：
```typescript
const params = output?.outcome?.params   // ← 正确层级
```

**同样的 bug 副本**还在 `packages/engine/src/kernel/verdicts/cross-proof-compute.ts:89-104` 的 `extractTargetFromOutput`，导致 cross-proof trendMatrix / clusters 的 target 字段也是 `(no-target)` fallback（cross-proof-compute.ts:115, 273）。

## 3. 决策

### D1：per-probe description + target 字段（ProofProbeIR 扩展）

新增 2 个 optional 字段：
- `description: string` — probe 验证意图说明（人读）
- `target: string` — probe 验证的目标产物（文件路径/URL/命令/分支）

**字段语义**：
- `description` 是"为什么验证"的意图层（intent）
- `target` 是"验证什么"的对象层（artifact）
- `ref + params` 是"怎么验证"的技术层（mechanism）

**向后兼容**：optional。老 proof.md 无此字段时为 undefined。

### D2：FrozenProofProbeResult schema 同步扩展

`packages/engine/src/kernel/schemas/probe-schema.ts` 的 `FrozenProofProbeResultSchema` 增加：
- `description: z.string().optional()`
- `target: z.string().optional()`

**向后兼容**：zod 默认 strict:false（旧字段不传不报错；新字段不传为 undefined）。

### D3：probe add CLI 增加 --description + --target 参数

`packages/cli/src/commands/proof.ts:496-593` 增加：
- `--description <text>` 写入 `- description: <text>` 行
- `--target <path-or-url>` 写入 `- target: <path>` 行

### D4：executeProbe 透传 description + target 到 FrozenProofProbeResult

`packages/engine/src/Proof/runner.ts:111-121` 返回值构造处增加：
```typescript
description: probe.description,
target: probe.target,
```

### D5：修复 outcome-writer.ts 的 extractTarget bug

删除 `packages/engine/src/Proof/outcome-writer.ts:177-194` 本地的 `extractTarget` 函数，改为 import `@openxenon/engine/kernel/verdicts/extraction` 的 `extractTarget`（唯一正确实现）。

### D6：修复 cross-proof-compute.ts 的 extractTarget bug

删除 `packages/engine/src/kernel/verdicts/cross-proof-compute.ts:89-104` 本地的 `extractTargetFromOutput` 函数，改为 import `./extraction` 的 `extractTarget`。

**fallback 保留**：即使 proof.md 未声明 `target`，修复后也能从 `output.outcome.params` 自动派生（pattern/command/path/url 之一）。

### D7：outcome.md Evidence 行增加 description 显示

`packages/engine/src/Proof/outcome-writer.ts:78-169` 的 `buildOutcomeMd` Evidence 段渲染逻辑：

```typescript
// 修改后
const targetStr = probe.target ? ` \`${probe.target}\`` : ''
const descLine = probe.description ? `\n  - intent: ${probe.description}` : ''
bodyLines.push(
  `- ${icon} **${probe.probeName}** \`${probe.ref}\`${targetStr} (${probe.outcome}, ${probe.durationMs}ms)${errLine}${flagsLine}${descLine}`,
)
```

**显示优先级**：
- `probe.target`（显式声明）优先
- 无声明 → 从 `extractTarget(probe)` 派生（D5 修复后可用）
- 都没有 → 不显示 target

### D8：probe 命名鼓励（不强制）

`--probeName` 已存在（proof.ts:509），保留默认 `p1/p2/...` 自动生成行为（D8.1），但**鼓励**用户传语义名（D8.2）。

D8.1: 默认行为不变（`nextProbeName` 逻辑保留）
D8.2: 当用户传 `--description` 但没传 `--probeName` 时，CLI 输出 hint 建议使用语义名（不阻断）

## 4. 改动清单（7 个文件）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `packages/engine/src/oxl/md-pipeline/transformers/proof.ts` | `ProofProbeIR` 加 `description?`/`target?`；`extractProbeFromFields` 读新字段 |
| 2 | `packages/engine/src/Proof/runner.ts` | `ProofProbeIR` 副本同步加字段；`executeProbe` 返回值透传 |
| 3 | `packages/engine/src/kernel/schemas/probe-schema.ts` | `FrozenProofProbeResultSchema` 加 optional `description`/`target` |
| 4 | `packages/cli/src/commands/proof.ts` | `probe add` 加 `--description`/`--target` 参数；写 proof.md 模板加字段；hint 输出 |
| 5 | `packages/engine/src/Proof/outcome-writer.ts` | **bug fix**：删除本地 `extractTarget`，改 import `extraction.ts`；Evidence 行显示 description |
| 6 | `packages/engine/src/kernel/verdicts/cross-proof-compute.ts` | **bug fix**：删除本地 `extractTargetFromOutput`，改 import `./extraction` |
| 7 | `packages/engine/src/Proof/outcome-writer.ts` | `buildOutcomeMd` Evidence 段渲染逻辑（D7） |

## 5. 改动后效果

### proof.md（改进后）

```markdown
## Probes

### package-json-exists
- description: 确认 package.json 存在
- ref: @oxn/probes/fs-exists
- target: ./package.json
- params:
  - pattern: ./package.json

### working-tree-clean
- description: 工作树干净无未提交改动
- ref: @oxn/probes/git-clean
- target: .
- params:
```

### frozen.json（改进后）

每个 probe result 增加 `description` 和 `target` 可选字段：

```json
{
  "probeName": "package-json-exists",
  "description": "确认 package.json 存在",
  "ref": "@oxn/probes/fs-exists",
  "target": "./package.json",
  "outcome": "COMPLETED",
  ...
}
```

### outcome.md（改进后）

```
## Evidence

- ✅ **package-json-exists** `@oxn/probes/fs-exists` `./package.json` (COMPLETED, 1ms)
  - intent: 确认 package.json 存在
- ❌ **working-tree-clean** `@oxn/probes/git-clean` `.` (DEVIATED, 31ms)
  - intent: 工作树干净无未提交改动
  - error: 1 dirty file(s) found
```

## 6. 风险评估

### 低风险
- D1-D2: 新增 optional 字段，零破坏性
- D5-D6: bug fix，从 undefined 行为改为正确行为（无副作用）
- D7: 渲染增强，向后兼容（无 description 时不显示 intent 行）

### 中风险
- D3-D4: CLI 行为扩展（新增参数），但默认行为不变
- D8.2: hint 输出可能让老用户意外（可在 1 版本后再加）

## 7. 验证方式

1. **重新跑 demo-proof-first**：删 demo + 重新 `oxn proof create` + `oxn proof probe add` 带 `--description` + `--target` + `oxn proof run`
2. **检查 frozen.json**：确认每个 probe 含 `description` 和 `target` 字段
3. **检查 outcome.md**：确认 Evidence 行显示 target + intent 子行
4. **老 proof 兼容**：保留旧的 p1/p2 proof.md（无 description/target），跑 `oxn proof run`，确认仍能跑且 outcome.md 显示从 params 派生的 target
5. **跑测试套**：`bun test` 确认无回归
6. **跑静态检查**：`bun run typecheck` + `bun run lint`

## 8. 不在本 Draft 范围

- 不改 `create` 模板的 `## Description` 段（whole-proof 级保留）
- 不改 `probe list` / `probe describe` 输出格式
- 不补新单元测试（先验证功能正确，测试可后续补）
- 不改 RFC-0015（这是 RFC-0015 之外的独立 UX 改进，本 Draft 引用 RFC-0015 而非反之）

## 9. 后续可考虑（不在本 Draft 范围）

- 把 `description` 改成必填（强制工程师写意图）
- 在 `create` 模板里给 `## Probes` 段加"产物清单" H3（whole-proof 维度显式声明）
- 在 `outcome.md` Evidence 段按 target 分组（按产物聚合 probe 结果）
- 在 `## Description` 段加 `### targets` H3（显式产物清单）
- probe-stats.json 按 target 维度聚合（已部分支持，但因 extractTarget bug 无效）

## 10. 关联决策

- **RFC-0015 D1.1**（已执行）：PROOF_VERDICT_MD → PROOF_OUTCOME_MD 重命名（与本 Draft 同步完成 outcome-writer 重命名）
- **RFC-0015 D2.1**（已执行）：probe handler 改经 Provider（与本 Draft 无直接冲突）
- **RFC-0015 D3.1**（未执行）：PROBE_STRATEGY_MAPPINGS 死表删除（与本 Draft 无关）

## 11. 审批

待审：pending