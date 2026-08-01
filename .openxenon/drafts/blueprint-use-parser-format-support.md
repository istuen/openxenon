# Blueprint `## Use` 解析器：新格式支持修复计划

> **日期**：2026-07-28
> 
> **来源**：ssot-asset-doc-boundary-audit-2026-07-28.md 的后续（Step 4-10 修复后暴露的运行时代码 gap）
> 
> **状态**：📝 Working Draft（待提升为 Work，输入到 `oxn work create blueprint-parser-format-fix`）
> 
> **关联**：ADR-0055（Blueprint composition template）/ v0.7.3-ideal-data-flow-rfc / three-boundary-blueprint-elevation-rfc.md / per-work-blueprints-merger.test.ts

---

## 背景

`ssot-asset-doc-boundary-audit-2026-07-28.md` 的 Step 1-10 修复（SSOT 收敛 + Asset 生命周期 Workflow 补 desc + doc-author 重构 + @prj/→@md/ + boundary 脚本扩展等）已成功落地。但落地后暴露出一个**运行时代码 gap**：

`oxn work validate` 返回 `valid: false`，原因 `E_MD_BLUEPRINT_MISSING_DOMAIN: Blueprint must reference at least 1 Domain`。6 个 E2E 测试（`work-ideal-data-flow-e2e.test.ts`）失败，Doc 编写 Workflow 因 Blueprint IR 提取失败而无法使用。

---

## 根因

`## Use` 段**两种合法格式**（蓝图设计层面），但运行时 parser 只支持旧格式：

| 格式 | 示例 | blueprint-compiler.ts | per-work-blueprints-merger.ts |
|---|---|---|---|
| **旧格式**（双字段） | `- kind: domain` + `- ref: @md/...` | ❌ 不支持 | ✅ 支持 |
| **新格式**（单字段） | `- domain: @md/...` | ✅ 支持 | ❌ 不支持 |

当前 `.openxenon/assets/blueprints/*.md` 全部用新格式（来自 `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/blueprint.md` 模板），但 `extractBlueprintRefs`（line 107-123）和 `parseBlueprintSlimFromMd` Format A（line 272-290）两个 parser 只用 regex `- kind:\s*(\S+)` + `- ref:` 匹配旧格式：

```typescript
const kind = block.match(/- kind:\s*(\S+)/)?.[1]      // 旧格式专属
const refLineMatch = block.match(/- ref:\s*([^\n]+)/)  // 旧格式专属
```

新格式 `- domain: @md/...` 无法被这两个 regex 匹配 → `domainRefs` 空 → `E_MD_BLUEPRINT_MISSING_DOMAIN` → Blueprint IR 失败 → validate 返回 `valid: false` → probe 边界检查 / DAG 检查 / Stack.tools 注入全部被跳过。

### 手动验证

```bash
cd /tmp/oxn-debug-test
bun work validate debug-work --json
# 返回：
# {
#   "ok": true,
#   "data": {
#     "code": "OXN_WORK_REFS_UNRESOLVED",
#     "valid": false,
#     "unresolved": [{
#       "reason": "E_MD_BLUEPRINT_MISSING_DOMAIN: Blueprint must reference at least 1 Domain"
#     }]
#   }
# }
```

---

## 受影响 parser 清单（4 处）

| # | 文件 | 行 | 函数 | 用途 |
|---|---|---|---|---|
| 1 | `packages/engine/src/Work/per-work-blueprints-merger.ts` | 272-290 | `parseBlueprintSlimFromMd` Format A | Work validate/lock 主路径 |
| 2 | `packages/engine/src/Work/per-work-blueprints-merger.ts` | 107-123 | `extractBlueprintRefs` | Work Blueprint ref 提取 |
| 3 | `packages/cli/src/commands/work.ts` | 3077-3082 | `collectWorkDomainProofs` | finalize 时收集 Domain invariant |
| 4 | `packages/engine/src/Work/__tests__/per-work-blueprints-merger.test.ts` | 167-175 | 测试 fixture | 单元测试用旧格式（需新增新格式用例）|

无关：`packages/engine/src/oxl/summary-extractors.ts:144` 的 `- kind:` 是 `## Externals` 段的字段（不是 `## Use` 段），不在修复范围。

---

## 修复策略：双格式兼容

**先尝试旧格式 `- kind:` + `- ref:`，失败则 fallback 新格式 `- domain:` / `- workflow:` / `- stack:` / `- blueprint:` 单字段。**

两种格式并存后，向后兼容旧 fixture（包括 `work-ideal-data-flow-e2e.test.ts:61` 的 `@prj/blueprints/oxn-blueprint` + `- kind: blueprint / - ref: "@prj/..."`）。

### 修复 #1: `parseBlueprintSlimFromMd` Format A（per-work-blueprints-merger.ts:272-290）

```typescript
if (kind === 'domain') domainRefs.push({ name: n, ref })
// ⬇ 改为：
let kind = block.match(/- kind:\s*(\S+)/)?.[1]
let ref: string | null = null
const refLineMatch = block.match(/- ref:\s*([^\n]+)/)
if (refLineMatch) {
  const refValue = refLineMatch[1]!.trim()
  const refClean = refValue.replace(/^["']|["']$/g, '')
  ref = (refClean.split(/\s+/).at(-1) ?? '') || null
}
if (!kind || !ref) {
  const singleField = block.match(/- (domain|workflow|stack|blueprint):\s*(\S+)/)
  if (singleField) {
    kind = singleField[1]
    ref = singleField[2]!.replace(/^["']|["']$/g, '')
  }
}
if (kind === 'domain') domainRefs.push({ name: n, ref })
else if (kind === 'workflow') workflowRefs.push({ name: n, ref })
else if (kind === 'stack') stackRefs.push({ name: n, ref })
else if (kind === 'blueprint' && n !== name) nestedBlueprintRefs.push({ name: n, ref })
```

### 修复 #2: `extractBlueprintRefs`（per-work-blueprints-merger.ts:107-123）

```typescript
const kind = block.match(/- kind:\s*(\S+)/)?.[1]
if (kind !== 'blueprint') continue
const refLineMatch = block.match(/- ref:\s*([^\n]*)/)
// ⬇ 改为：
let kind = block.match(/- kind:\s*(\S+)/)?.[1]
let refValue = block.match(/- ref:\s*([^\n]*)/)?.[1]?.trim() ?? ''
if (kind !== 'blueprint') {
  // 新格式 fallback：- blueprint: @md/blueprints/<name>
  const singleField = block.match(/- blueprint:\s*(\S+)/)
  if (singleField) {
    kind = 'blueprint'
    refValue = singleField[1]!.replace(/^["']|["']$/g, '')
  } else {
    continue
  }
}
if (!refValue) continue
const refClean = refValue.replace(/^["']|["']$/g, '')
const refLast = refClean.split(/\s+/).at(-1) ?? ''
out.push({ name, ref: refLast || null })
```

### 修复 #3: `collectWorkDomainProofs`（work.ts:3077-3082）

```typescript
const kind = block.match(/- kind:\s*(\S+)/)?.[1]
if (kind === 'domain') domains.push(name)
// ⬇ 改为：
let kind = block.match(/- kind:\s*(\S+)/)?.[1]
if (kind !== 'domain') {
  // 新格式 fallback：- domain: @md/domains/<name>
  if (block.match(/- domain:\s*\S+/)) kind = 'domain'
}
if (kind === 'domain') domains.push(name)
```

### 修复 #4: 测试 fixture 更新（per-work-blueprints-merger.test.ts）

不删除旧格式用例（line 157-215），**新增**新格式测试用例：

```typescript
test('.md 格式（新格式 - 单字段）：完整 Blueprint（- domain:/- workflow:/- stack:）', () => {
  const md = `---
entity: blueprint
version: 2
name: ci-pipeline
---

# Blueprint: ci-pipeline

## Use
### payment-domain
- domain: @md/domains/PaymentContext
### fix-issue-workflow
- workflow: @md/workflows/fix-issue
### node-stack
- stack: @md/stacks/node-ts

## Boundaries

### build
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - fs-exists
  - ts-compiles
- deps: []

### test
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - test-pass
- deps:
  - build
`
  const r = parseBlueprintSlim(md)
  expect(r.name).toBe('ci-pipeline')
  expect(r.errors).toEqual([])
  expect(r.domainRefs.map((d) => d.name)).toEqual(['payment-domain'])
  expect(r.workflowRefs.map((w) => w.name)).toEqual(['fix-issue-workflow'])
  expect(r.stackRefs.map((s) => s.name)).toEqual(['node-stack'])
  expect(r.slots).toHaveLength(2)
  expect(r.slots[0]?.name).toBe('build')
  expect(r.slots[0]?.observe).toEqual(['fs-exists', 'ts-compiles'])
  expect(r.slots[1]?.name).toBe('test')
  expect(r.slots[1]?.deps).toEqual(['build'])
})
```

### 不修改 E2E 测试

`work-ideal-data-flow-e2e.test.ts:61` / `64` 用旧格式 `@prj/` + `- kind: blueprint / - ref: "@prj/..."`。修复 parser 后，旧格式 fixture 仍能正确解析（先尝试旧格式成功 → fallback 不触发），向后兼容。

---

## 影响文件清单

| # | 文件 | 修改类型 | 行数变化 |
|---|---|---|---|
| 1 | `packages/engine/src/Work/per-work-blueprints-merger.ts` | Format A + extractBlueprintRefs 双格式 fallback | +12 行 |
| 2 | `packages/cli/src/commands/work.ts` | collectWorkDomainProofs 双格式 fallback | +5 行 |
| 3 | `packages/engine/src/Work/__tests__/per-work-blueprints-merger.test.ts` | 新增新格式测试用例 | +45 行 |

**总计 3 个文件，约 60 行代码改动。**

---

## 验证步骤

```bash
# 1. 单元测试（验证 parser 双格式兼容）
bun test packages/engine/src/Work/__tests__/per-work-blueprints-merger.test.ts

# 2. E2E 测试（验证旧格式 fixture 仍通过）
bun test packages/cli/src/__tests__/work-ideal-data-flow-e2e.test.ts

# 3. 手动验证（用真实 Asset）
cd /tmp/oxn-debug-test
bun /Users/issac/pro/openxenon/packages/cli/src/index.ts work validate debug-work --json
# 期望：
# {
#   "ok": true,
#   "data": {
#     "code": "OXN_WORK_VALID",
#     "valid": true,
#     ...
#   }
# }

# 4. 全量测试
bun test

# 5. typecheck + lint + validate-deps + check-doc-boundary
bun run typecheck
bun run lint
bun scripts/validate-dependencies.ts
bun scripts/check-doc-boundary.ts
```

预期结果：
- 单元测试：3/3 绿（2 旧格式 + 1 新格式）
- E2E 测试：6 个原失败 → 全部绿
- 全量测试：1632 pass / 3 skip / 0 fail（之前的 6 fail 全部修复）
- 其他检查：保持原状态（typecheck / lint / boundary 已绿）

---

## 风险评估

- **低风险**：双格式兼容机制（先旧后新 fallback），不破坏旧格式解析
- **向后兼容**：现有用旧格式的 work.md（含 E2E 测试 fixture）不受影响
- **测试覆盖**：新增 1 个新格式单元测试用例 + 保留 2 个旧格式 E2E 测试覆盖
- **作用域限制**：仅修改 Blueprint `## Use` 段解析，不涉及 `## Boundaries` 段（已双格式一致）

---

## 范围外（非本次修复）

| 问题 | 文件 |
|---|---|
| Blueprint `## Boundaries` refs 与 `## Use` 段命名不匹配（如 `dev-workflow` 不在 `## Use` 中）| 5 个 Blueprint 文件 |
| dev-workflow.md Slots 还含 `deps`/`observe`（不合规 v0.7 编译器）| `packages/engine/src/oxl/md-bridge/compilers/workflow-compiler.ts` 决定的 |
| 7 个 Workflow 有 `## Props` 段 | `packages/engine/src/oxl/md-bridge/compilers/workflow-compiler.ts` |
| 11 个 Workflow 缺 slot `desc` | 多个 Workflow 文件 |

本次修复完成后，Asset 即可用于 Doc 编写（`oxn work create` with `doc-rfc-workflow` / `doc-dev-workflow` / `doc-prod-workflow` Blueprint）。其余问题延后到后续 Work（参考 ssot-asset-doc-boundary-audit-2026-07-28.md §3.3 延后清单）。

---

## 未来 Work 入口

建议路径：`oxn work create blueprint-parser-format-fix --blueprint doc-dev-workflow`（开发场景，因本次修复是开发类任务）。
- Intent: 修复 Blueprint `## Use` 段 parser 双格式兼容
- Align: 运行代码修改 + 新增单元测试
- Proof: 单元测试 + E2E 测试 + 手动验证

完成后将 `.openxenon/drafts/ssot-asset-doc-boundary-audit-2026-07-28.md` 标记为「下游 Draft」，可在该文档顶部加注「修复代码 runtime gap 的子计划见 blueprint-use-parser-format-support.md」。
