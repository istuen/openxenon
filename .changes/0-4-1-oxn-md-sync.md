# 0.4.1 — .oxn ↔ .md 双向同步 + Work Refs + Grammar 修复

> **v0.4.1 主题**：基于 v0.4.0 的 unified-native MD 范式, 实现 3 件大事：
> 1. **.oxn ↔ .md 双向自动同步** (`oxn sync` / `sync-md`)
> 2. **work-level domain/blueprint refs** (WorkIR 增强 + `## Refs` H2)
> 3. **OXL grammar backtrack 修复** (loopPolicy 移出 WorkContext)
> + 修复 3 个预先存在的 round-trip bug

## 1. 新增命令 (6 个 CLI 子命令)

### Phase 1: `oxn {domain,blueprint,work} sync` (正向, .oxn → .md)

```bash
oxn domain sync <name>          # 同步单个 domain
oxn domain sync --all           # 批量同步所有 domain
oxn domain sync X --dry-run     # 只检测，不写
oxn domain sync X --no-chain    # 跳过回链 (只写 .md，不改 .oxn)
```

**算法**:
1. 读 .oxn → SHA-256 → `sha_oxn_current`
2. 读 .md frontmatter `oxn-source-sha` → `sha_oxn_prev`
3. 若 `sha_oxn_current == sha_oxn_prev` → no-op (idempotent)
4. 否则: `compileOxnToMd(.oxn)` → 写 .md + 注入 sync frontmatter
5. 写 `.cache/<name>.hash` = 新 .md SHA-256 (fast-path 比对源)

### Phase 2: `oxn {domain,blueprint,work} sync-md` (反向, .md → .oxn)

```bash
oxn domain sync-md <name>             # 反向同步单个 domain
oxn domain sync-md --all              # 批量
oxn domain sync-md X --dry-run        # 只检测，不写
oxn domain sync-md X --no-chain       # 跳过回链 (只写 .oxn)
oxn domain sync-md X --oxn-priority   # 冲突反转 (.oxn 优先)
oxn domain sync-md X --no-roundtrip   # 跳过 round-trip 守卫
oxn domain sync-md X --no-parse-check # 跳过 langium parse 守卫
```

**算法**:
1. 读 .md → SHA-256 → `sha_md_current`
2. 读 `.cache/<name>.md-hash` → `sha_md_prev`
3. 若 `sha_md_current == sha_md_prev` → no-op
4. 否则: `parseMarkdown(.md)` → `extractXxxIR` → `serializeXxxToOxn` → 写 .oxn
5. **守卫 1**: `validateOxnParseable(oxn)` (langium parse 不抛错)
6. **守卫 2**: `verifyXxxRoundTrip(ir, oxn)` (serialize → compile → extract → diff, 关键字段不丢)
7. 触发 Phase 1 sync 更新 .md frontmatter + .cache (除非 `--no-chain`)
8. 写 `.cache/<name>.md-hash` = 新 .md SHA-256 (链后值, 确保下次 idempotent)

## 2. 冲突策略

| `.oxn` 改 | `.md` 改 | 默认 | 反向 flag |
|---|---|---|---|
| ❌ | ❌ | no-op | — |
| ✅ | ❌ | Phase 1: 重生成 `.md` | — |
| ❌ | ✅ | Phase 2: 重生成 `.oxn` | — |
| ✅ | ✅ | **`.md` 优先**: Phase 2 重生成 `.oxn` → Phase 1 重生成 `.md` | `--oxn-priority` 反转 |

**默认 `.md` 优先的理由** (RFC §3.3 Q2=B):
- `.md` 是人类阅读友好的视图 (GitHub / Obsidian / Typora)
- AI 工具更容易改 `.md` (无 langium parser 介入)
- `.oxn` 是编译产物 (langium 序列化 + 强类型)

## 3. 双向同步 hash 链

```
.openxenon/domains/CodeQualityContext.oxn                    (源, 唯一可被 langium 改的)
.openxenon/domains-md/CodeQualityContext.md                  (派生 view)
.openxenon/domains-md/.cache/CodeQualityContext.hash          (Phase 1: .md SHA-256)
.openxenon/domains-md/.cache/CodeQualityContext.md-hash      (Phase 2: .md SHA-256)
```

每次 sync 都更新对应 cache，下次 sync 据此判定 no-op。

## 4. 错误码 (D6: E_SYNC_* 前缀)

| 错误码 | 触发条件 | 行动 |
|---|---|---|
| `E_SYNC_LANGIUM_VALIDATION_FAILED` | 反向 .oxn 不通过 langium parse | YIELD_TO_HUMAN: 检查 .md 字段名 (H3 唯一) |
| `E_SYNC_ROUND_TRIP_LOSS` | `extract(parse(syncMd(syncOxn(ir)))) ≠ ir` (terms/bans/invariants 数量不匹配) | YIELD_TO_HUMAN: 检查 .md 分类完整性 |
| `OXN_SYNC_ARGS_MISSING` | 既无 `<name>` 也无 `--all` | 提示用法 |

## 5. sync frontmatter 字段

写 .md 时自动注入:
```yaml
---
entity: domain          # 已存在
version: 0.3.0          # 已存在 (MD canonical version)
name: CodeQualityContext # 已存在
oxn-source-sha: <sha>   # 新: 写 .md 时 .oxn 的 SHA
synced-at: <iso>        # 新: 本次 sync 时间
---
```

> **设计取舍**：`md-self-sha` 不写在 frontmatter (避免 chicken-and-egg — SHA 依赖自己)。
> .md 的 SHA 仅存于 `.cache/<name>.hash`。

## 6. Work-level Refs (v0.4.1 新增)

### 动机

`WorkIR` 之前缺 `domainRefs` / `blueprintRefs` 字段, 导致 work-level ref 声明 `domain "X" ref "...";` 在 round-trip 后丢失。

### .md 格式 (与 work.oxn 语法层级一致)

```markdown
# Work: my-work

## Context
### primary
- goal: ...
- max_iterations: 3
- constraints: [...]

## LoopPolicy        ← 新 H2 (从 WorkContext 移出)
### primary
- max_iterations: 3

## Refs              ← 新 H2
### IntentAlignContext
- kind: domain
- alias: primary
- ref: @prj/domains/intent-align-context

### dev-workflow
- kind: blueprint
- ref: @prj/blueprints/dev-workflow

## Tasks
### step-1
...
```

### .oxn 格式 (work-level ref 池)

```oxn
work "my-work" {
  context {
    goal = "...";
    constraints = [...];
  }
  loop_policy {
    max_iterations = 3;
  }
  domain "IntentAlignContext" as "primary" ref "@prj/domains/intent-align-context";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "step-1" { ... }
}
```

### IR 新增

- `WorkRef` interface: `{ kind, name, ref, alias }`
- `WorkIR.refs: WorkRef[]`
- `WORK_CATEGORIES` 加 `'LoopPolicy'` + `'Refs'`

### 受影响文件

- `src/oxl/md-pipeline/transformers/work.ts` (WorkIR + WORK_CATEGORIES)
- `src/oxl/md-bridge/compilers/work-compiler.ts` (decompiler 加 `## LoopPolicy` + `## Refs` H2)
- `src/oxl/md-pipeline/oxn-serializer.ts` (serializeWorkToOxn 加 ref 池输出)

## 7. OXL Grammar 修复 (loopPolicy 移出 WorkContext)

### 问题

`WorkContext` grammar 连续 3 个 optional + 1 mandatory `}`, LL parser 不做 backtrack:
```antlr
WorkContext:
    'context' '{'
        ('goal' '=' goal=STRING ';')?
        ('constraints' '=' '[' ... ']' ';')?
        (loopPolicy=LoopPolicy)?       ← 匹配后 commit
    '}';                                ← 之后没有 `}`
```

**症状**: 含 `loop_policy` 的 .oxn 手动加 `domain "X" as "Y" ref "Z";` 报错 (`expected '}' but found 'domain'`)。
但 Phase 1 → Phase 2 自动生成的 .oxn 结构正确, 不受影响。

### 修复

loopPolicy 移出 WorkContext, 作为 work-level 字段:

```antlr
WorkContext:
    'context' '{'
        ('goal' '=' goal=STRING ';')?
        ('constraints' '=' '[' ... ']' ';')?
    '}';                                  ← 现在 close

WorkDeclaration:
    'work' name=STRING '{'
        (context=WorkContext)?
        (loopPolicy=LoopPolicy)?            ← work-level, optional
        (domains+=DomainRefDecl)*
        ...
```

### 受影响文件

- `src/oxl/langium-driver/oxn.langium` (grammar 改)
- `src/oxl/langium-driver/generated/{ast,grammar,module}.ts` (regenerated via `bun run langium:generate`)
- `src/oxl/md-pipeline/transformers/work.ts` (`WORK_CATEGORIES` 加 `'LoopPolicy'`, extractor 加 H2 处理)
- `src/oxl/md-bridge/compilers/work-compiler.ts` (decompiler 加 `## LoopPolicy` H2)
- `src/oxl/md-pipeline/oxn-serializer.ts` (serializer emit loopPolicy 在 context 外)
- `src/oxl/schemas/oxn-assembly.schema.ts` (`OxnWorkLoopPolicySchema` 独立 schema)
- `src/oxl/generator/oxn-generator.ts` (work generator 读 `decl.loopPolicy`)
- `src/cli/work.ts` (`snapshotContext` 签名加 loopPolicy 参数)
- 13 个 test fixtures + 30 个 .openxenon/works/*/work.oxn (perl 批量更新)

### 影响

- ⚠ **破坏性变更**: 已有 .oxn 文件含 `loop_policy` 在 context 内, 需手动移出 (本次发布批量更新)
- ✅ 修复后: 手动编辑 .oxn 加 ref 不再被 parser 拒绝
- ✅ 完整 30 works 端到端 round-trip OK

## 8. 修复 3 个预先存在的 round-trip bug

### Bug 8.1: Domain description 丢失 + 被覆盖

**根因**:
- `DomainIR` 无 `description` 字段
- serializer 错误地将第一项 term 的 desc 填入 `description = "..."`

**修复**:
- `DomainIR` 加 `description: string` 字段
- `extractDescription(root)` 抽取 H1 与首个 H2 之间的 `> blockquote` 作为域描述
- `serializeDomainToOxn` 直接用 `ir.description` (不再回退到 term)
- 兼容路径: 老 IR (无 description) 仍回退到第一项 term

**验证**: 原始 `description = "源代码质量的检测与改善限界上下文：跨平台一致性、命名解析、模式应用、行为漂移"` 完整 round-trip ✓

### Bug 8.2: Blueprint version 丢失

**根因**:
- `.md` frontmatter `version: 1` (来自 .oxn `version = 1`) 被 yaml parser 解析为 `number: 1`
- `extractBlueprintIR` 用 `typeof === 'string'` 检查 → 永远 fallback 到默认 `'0.1.0'`
- serializer 的正则 `^\d+(\.\d+)?$` 不匹配 `0.1.0` → 不 emit

**修复**:
- `extractBlueprintIR`: `String(frontmatter.version)` 兼容 number/string
- 同样修复 `extractDomainIR` + `extractWorkIR` 的 version 字段

**验证**: 原始 `version = 1` 完整 round-trip ✓

### Bug 8.3: DomainIR.description 字段缺失

**修复**: 已在 Bug 8.1 修复中解决 (加了 `description: string` 字段)

## 9. 修复 citty arg 解析 bug (`--no-X` flag)

**症状**: `oxn {domain,blueprint,work} sync-md --no-chain` 实际上没跳过 Phase 1 chain。

**根因**: citty 0.1.6 把 `--no-X` 解析为 `X: false` (前缀反转), 而代码用 `ctx.args['no-chain'] === true` 永远拿到 `undefined`。

**修复**: 改用 `ctx.args.chain === false` 模式 (3 个 `--no-X` 标志都改)。

**影响文件**:
- `src/cli/domain.ts`
- `src/cli/blueprint.ts`
- `src/cli/work.ts`
- `src/cli/__tests__/sync-md-e2e.test.ts` 加回归测试

## 10. 修复测试 setup/teardown 漏 snapshot (entity registry)

**根因**: `domain-blueprint-compile-e2e.test.ts` 调用 `entityRegistry._clearForTest()` 后只 re-register `DomainCompiler`, 其他蓝图/工作 compiler 丢失。后续 sync-validation 测试报 `E_OXL_ENTITY_NOT_REGISTERED`。

**修复**: 
- 保存原始 `_compilers` Map
- 测试中 register 全部 5 个 (domain/blueprint/work/task/proof)
- `afterEach` 恢复原始状态

**影响文件**:
- `src/cli/__tests__/domain-blueprint-compile-e2e.test.ts`

## 11. 兼容性 / 迁移路径

- ✅ Phase 1 sync 不破坏 v0.4.0 用户 (与 v0.4 sync 行为一致)
- ✅ Phase 2 sync-md 是可选 (默认 .md 优先, 用户无需感知)
- ⚠ Phase 2 reverse 后, 原手写 .oxn 注释可能丢失 (RFC §3.2 明确接受)
- ⚠ LoopPolicy 语法破坏性变更 (context 内 → context 外), 需 `bun run langium:generate` + .oxn 重写
- ⚠ 三个 round-trip bug fix 修复了信息丢失 (description / version), 但已生成的 .md 可能已不正确, 用户应重跑 sync
- ❌ Phase 3 范围 (v0.5): 移除 .oxn, .md 唯一源

## 12. 已知 Cosmetic 差异 (RFC §3.2 接受, 未修)

| 项 | 说明 |
|---|---|
| Header 注释丢失 | `// 业务限界上下文：...` 等手写注释 |
| 列对齐丢失 | `"Key":     "Value"` → `"Key": "Value"` |
| 空行/单行注释丢失 | `// 必跑：bun install ...` |

## 13. 11 个 PR 列表 (v0.4.1 历程)

| # | 类型 | 内容 | 文件数 |
|---|---|---|---|
| 1 | 新增 | `oxn {domain,blueprint,work} sync` (Phase 1, .oxn→.md) | 3 CLI + 1 helper + 1 unit + 1 e2e |
| 2 | 新增 | `oxn {domain,blueprint,work} sync-md` (Phase 2, .md→.oxn) | 3 CLI + 1 helper + 3 unit + 1 e2e |
| 3 | 守卫 | sync-validation module (langium parse + round-trip diff) | 1 module + 14 unit |
| 4 | 守卫 | conflict resolution (`--oxn-priority` flag, 5 决策场景) | 3 CLI flag |
| 5 | 修复 | domain-blueprint-compile-e2e 测试 setup/teardown snapshot 修复 | 1 test |
| 6 | 修复 | citty 0.1.6 `--no-X` flag 解析 bug | 3 CLI + 1 回归测试 |
| 7 | 新增 | Work-level Refs (WorkRef IR + `## Refs` H2 + work-level ref 池 round-trip) | 4 文件 + 1 e2e |
| 8 | 修复 | OXL Grammar: loopPolicy 移出 WorkContext (LL parser backtrack 修复) | 8 文件 + 30 .oxn 批量更新 |
| 9 | 修复 | 3 个预先存在的 round-trip bug (domain description / blueprint version / DomainIR.description 字段) | 5 文件 + 2 e2e |

## 14. 数字

| 维度 | v0.4.0 | **v0.4.1** | Δ |
|---|---|---|---|
| tests pass | 1726 | **1796** | +70 |
| 新增 CLI 子命令 | — | **6** (`{domain,blueprint,work} sync` + `sync-md`) | +6 |
| sync-hash 行数 | 0 | **136** | +136 |
| sync-validation 行数 | 0 | **190** | +190 |
| oxn-serializer 行数 | 0 | **213** | +213 |
| WorkIR 新增字段 | — | `refs: WorkRef[]` | +1 |
| WORK_CATEGORIES | 2 | 4 (Context/LoopPolicy/Refs/Tasks) | +2 |
| OXL 错误码 (E_SYNC_*) | 0 | 3 | +3 |
| 30 work + 11 blueprint + 15 domain 端到端 round-trip | — | **56/56 OK** | — |

## 15. RFC

- 双向同步设计: [`.openxenon/pools/sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md`](../sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md)
- v0.4 主题: [`.openxenon/pools/sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md`](../sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md)

## 16. 验证

- 1796/1796 全仓库 tests pass (含 30+30+14 sync + 18 sync-md e2e + 14 sync-validation unit + 4 回归测试)
- typecheck clean
- biome check clean (3 warnings + 9 infos, pre-existing)
- 15 domain + 11 blueprint + 30 work 全 idempotent sync 端到端 OK
- Phase 1 → Phase 2 双向 round-trip 完整: `serialize(extract(md)) → oxn → compile(oxn) → md → extract(md) ≈ ir`
- `--oxn-priority` 冲突反转实测: 改 .oxn 后 .md 不被改, 反之亦然
- **新**: 30 work + 11 blueprint + 15 domain 双向 sync + round-trip 关键字段 (`description` / `version`) 全部保留
- **新**: OXL grammar 修复后, 手动编辑 .oxn 加 work-level ref 不再被 parser 拒绝