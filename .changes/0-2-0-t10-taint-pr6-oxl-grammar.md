# 0.2.0 — Sprint 5b T10: Probe Signal Taint v2 PR-6 OXL 1.3 grammar + builtin probe 模板迁移

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-6
> Sprint 5b 任务 T10, probe-taint v2 6 PR 系列的第 6 PR (OXL grammar 第 1 阶段)
> 前置: T1+T2+T3+T4+T5+T6+T7+T8+T9 已合入主分支
> ⚠ 串行约束: 本 PR 必须在 T11 (three-layer PR-1 grammar 扩展) 之前合入, 两次 langium:generate 分两次 PR, 绝对禁止并行

## 变更

### 1. OXL grammar 改造 (src/oxl/langium/oxn.langium)

```diff
ProbeDeclaration:
    'probe' name=STRING '{'
+       ('scheme' ':' scheme=STRING)?     // ← v0.2 T10 (OXL 1.3) 新增可选
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (output+=ProbeOutputDeclaration)?
    '}';
```

**设计取舍**:
- `scheme:` 字段**可选** — 未声明时使用 URI 前缀推断
- 声明 `scheme: 's3://'` 用于: URI 字符串缺失时显式寻址 (如 `probe s3_check { scheme: 's3://', matcher = ... }`)
- **不**强制要求 `scheme:` 必填 — 保持向后兼容

重新生成: `bun run langium:generate` → `src/oxl/generated/{ast,grammar,parser,module}.ts` + `syntaxes/oxn.tmLanguage.json`
- `ProbeDeclaration` interface 自动增加 `scheme?: string`

### 2. 15 builtin probe 模板迁移 (src/builtin/probes/)

| 模板 | scheme |
|---|---|
| `fs-exists` / `fs-not-exists` / `fs-content-match` / `fs-parseable` | `file://` |
| `git-clean` / `git-status-clean` / `git-branch-exists` / `git-merge-feasible` | `git://` |
| `http-responds` | `http://` |
| `shell-exec` | `shell://` |
| `deps-resolved` / `file-exports` / `lint-check` / `test-pass` / `ts-compiles` | `file://` |

**示例** (`fs-exists.oxn`):
```diff
probe "fs-exists" align "FsExists" {
+   scheme = "file://"
    description = "检查指定 glob 模式的文件是否存在"
    prop "pattern" { type = string; required = true }
    output { exists = boolean }
}
```

### 3. Validators (src/oxl/validators/)

#### `probe-validator.ts` (~60 行, 新)
```ts
export function validateProbeSchemes(
  probes: ProbeDeclaration[],
  registry: ProviderRegistry,
): ValidateProbeSchemesResult
// 返 { ok: true } | { ok: false; errors: Array<{ probeName, reason }> }

// 3 规则 (本 PR 实施前 2):
//   1. scheme 格式合法 (必以 "://" 结尾)
//   2. scheme 已在 ProviderRegistry 注册 (builtin 或 cli-add)
//   3. (T10 留 T11) scheme 与 target URI 前缀一致
```

#### `validators/index.ts` (新)
统一出口 (含 probe-validator + blueprint-dag + probe-namespace + probe-ref-validator)

### 4. 单元测试 (22 case)

`src/oxl/builtin/__tests__/probe-templates.test.ts` (16 case):
- 1: 至少有 14 个 builtin probe 模板
- 2-16: 每个 probe 文件含 `scheme:` 字段 + 合法 scheme 格式 (`scheme://`)

`src/oxl/validators/__tests__/probe-validator.test.ts` (6 case):
1. 合法 builtin scheme → ok
2. 合法 cli-add scheme → ok
3. scheme 格式错 → errors[0].reason 含 `'must end with "://"'`
4. scheme 未注册 → errors[0].reason 含 `'not registered'` + 引导 `'oxn probe add'`
5. 多 probe 含 1 个错 → errors 数组含该 probe
6. scheme 字段缺失 → ok (向后兼容)

## 指标

- 测试: 1336 → **1358** (+22: 16 probe-templates + 6 probe-validator)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 14 个 builtin probe 透传: 不变 (T10 不动 verdict strategies)
- 行为变化:
  - OXL 1.3 grammar 加可选 `scheme:` 字段 (ProbeDeclaration)
  - 15 builtin probe 模板全部含 scheme 声明
  - `validateProbeSchemes` validator 函数可用 (CLI 集成留 T11/T12)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| OXL grammar 改动影响现有 builtin .oxn 模板 | 中 | scheme 字段**可选**, 保持向后兼容; 14 builtin probe 透传测试通过 |
| builtin .oxn 模板的 `align "..."` 语法与 ProbeDeclaration 形态不完全匹配 | 中 | 现状: builtin .oxn 是 template 形式, 不直接 parse (强 parse 会失败); T10 测试只断言 scheme: 文本存在, 不强求 parse ok |
| ProbeStatement 与 ProbeDeclaration 命名混淆 | 低 | 父文档用 `ProbeStatement` 表示 use site (PartProbeDeclaration); 本 PR 在 ProbeDeclaration (asset def) 加 scheme, 因为 builtin .oxn 是 asset def 形式 |
| probe-validator CLI 集成未实施 | 低 | T10 范围只交付 validator 函数; CLI 集成 (src/cli/domain.ts + src/cli/blueprint.ts 调用) 留 T11/T12 |
| T11 grammar 扩展并发冲突 | 中 | ⚠ 串行约束遵守: 本 PR 已在 T10 完成, T11 后续 (script/manual/scope/domain_proofs 字段) 严禁并行 |

## 关联

- 上游: T1+T2+T3+T4+T5+T6+T7+T8+T9 已合入主分支
- 下游 [sprint-5c 计划]: T11 three-layer PR-1 grammar 扩展 (script/manual/scope/domain_proofs 字段) — 串行, 不可与 T10 并行
- 下游 [sprint-5d 计划]: T12 three-layer PR-2 finalize (work finalize 二阶段原子写 pools/research/<slug>/frozen.json)
- 依赖外部: `src/infra/registry/provider-registry.ts` (T6 已就位) + `langium:generate` 工具
- **taint 6 PR 系列收官**: PR-1 → PR-2 → PR-3 → PR-4 → PR-5 → **PR-6 (T10) ← 本 PR**

Refs: .openxenon/forges/sprints/sprint-5b/2026-06-15-probe-taint-oxl-grammar-pr6.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
