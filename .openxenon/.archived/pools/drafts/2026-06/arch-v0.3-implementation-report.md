# v0.3 实施报告（阶段 0-3 完成总结）

> **日期**：2026-06-21
> **状态**：✅ v0.3 阶段 0+1+2+3 全部完成
> **作者**：opencode（与用户决策协作）
> **基线**：v0.2.0 frozen (commit `5b81e8d`)
> **当前分支**：`feat/v0.3-md-ssot` (6 commits ahead of dev)
> **关联**：[`md-ssot-system.md` v3.2](./md-ssot-system.md) · [`v0.3.0-roadmap.md` v3.1](./v0.3.0-roadmap.md) · [`intent-ssot-boundary.md` v1.0](./intent-ssot-boundary.md)

---

## 0. TL;DR

v0.3 是 OpenXenon 的 **MD-SSOT 体系落地**版本。2 周（~6 周开发估算）内完成 4 阶段实施：

| 阶段 | 内容 | 主要交付 | 状态 |
|---|---|---|---|
| **0** | 战略 + 文档 + 抽象 | 18 篇 v0.3 文档 + OxlDriver 抽象 + langium-driver 内聚 | ✅ |
| **1** | md-bridge 核心 | unified 接入 Kernel Schema（8 任务 / 12 文件 / 97 tests）| ✅ |
| **2** | .oxn ↔ .md 双轨制 | source-hash + compiler + adapter（3 文件 / 30 tests）| ✅ |
| **3** | forges/ 迁移 | 7 篇 Intent 文档迁移到 pools/ + 41 篇保留 forges/ | ✅ |
| **4** | scripts 自动化 | （推迟 v0.4.0）| ⏳ |

**核心命题（v0.3 §1.1）**：

> **MD-SSOT 不是"所有文档 MD 化"，而是"Intent 唯一 MD 化"**。
>
> Intent（domain/blueprint/work/task/proof）是 OpenXenon 内部 SSOT，强制 MD + mdast + 5 E_MD_xxx。
>
> 外部文档保持原状，Intent MD 通过 URL/相对路径外链引用。

---

## 1. 累计交付

### 1.1 代码交付

| 类别 | 文件 | 行数 | 测试 |
|---|---|---|---|
| **md-bridge 源码** | 12 | ~3,870 | — |
| **md-bridge 测试** | 7 | ~1,750 | 97 + 30 = **127** |
| **OxlDriver 抽象** | 1（`contracts/oxl-driver.ts`）| 129 | 10 |
| **langium-driver 内聚** | 4（3 旧 + 1 新增）| ~440 | 复用 |
| **总新增** | **24** | **~6,189** | **137** |

### 1.2 文档交付

| 类别 | 数量 | 行数 |
|---|---|---|
| **pools/sprints/v0.3-md-ssot/design/** | 17 | ~5,400 |
| **pools/sprints/v0.3-md-ssot/audit/** | 2 | ~543 |
| **pools/sprints/v0.3-md-ssot/journal/** | 3 | ~500 |
| **pools/sprints/v0.3-md-ssot/_archive/2026-06/** | 2 | ~700 |
| **pools/pool-roadmap.md** | 1 | ~265 |
| **v0.3 sprint 文档总计** | **25** | **~7,400** |

### 1.3 测试统计

| 项 | 数据 |
|---|---|
| **v0.2.0 frozen** | 1393 tests pass |
| **v0.3 feat 分支** | **1524 tests pass** |
| **净增测试** | **+131**（127 md-bridge + 10 OxlDriver - 6 失效） |
| **失败** | 0 |

### 1.4 累计 commits（6 个 in feat/v0.3-md-ssot）

```
b6560d6 feat(pools): v0.3 stage 3 — forges/ 7 Intent docs migration
3fe00a9 feat(oxl): v0.3 stage 2 — .oxn ↔ .md dual-track implementation
5052b10 feat(oxl): v0.3 stage 1 T2-T8 — md-bridge complete implementation
9b36284 build(deps): add unified ecosystem for v0.3 md-bridge (T1)
1092e4e refactor(pools): aggregate v0.3 docs into sprints/v0.3-md-ssot/
7f710e2 feat(v0.3): stage 0 launch — 18 design docs + langium-driver refactor + md-bridge
```

---

## 2. 阶段 0 — 战略 + 文档 + 抽象

### 2.1 关键成果

| 成果 | 角色 |
|---|---|
| **18 篇 v0.3 文档** | 核心架构 + 路线图 + 边界权威 + 5 阶段 + 4 跨切 |
| **`pools/sprints/v0.3-md-ssot/` 子目录** | 版本化 sprint 容器（方便对比）|
| **OxlDriver 抽象** | langium + mdast 双 driver 切换 |
| **langium-driver 内聚** | src/oxl/langium/ → src/oxl/langium-driver/（纯路径）|

### 2.2 关键决策（4 项）

| 决策 | 含义 |
|---|---|
| **Intent 唯一 MD 化** | v2 错误命题"全栈 MD 化"被纠正为"Intent 唯一 MD 化" |
| **.md = 唯一写入入口** | 双轨制下禁止反向修改 .oxn |
| **E_MD_REFERENCE_BROKEN 二级** | 内部 = Fatal（阻断），外部 = Warn（警告）|
| **scope C v3 收窄为 2 阶段** | v0.3.0 范围从 6 阶段 18 周收窄为 2 阶段 6 周 |

### 2.3 文件变更

| 文件 | 变更 |
|---|---|
| `langium-config.json` | 路径 `src/oxl/langium/` → `src/oxl/langium-driver/` |
| 14+ 文件 | import 路径修复（`../langium/` → `../langium-driver/`）|
| `src/oxl/contracts/oxl-driver.ts` | 新增（OxlDriver 抽象接口）|
| `src/oxl/langium-driver/langium-oxl-driver.ts` | 新增（LangiumOxlDriver 实现）|
| `src/oxl/md-bridge/driver-registry.ts` | 新增（driver 注册表）|
| `src/oxl/md-bridge/mdast-oxl-driver.ts` | 新增（mdast driver 实现）|

### 2.4 用户反馈整合（4 项建设性意见）

1. **双轨期冲突解决协议**（`.md` 唯一写入）
2. **E_MD_REFERENCE_BROKEN 严重级别**（Fatal/Warn 二级）
3. **Task 解析性能**（contentHash 缓存 + 7 天 TTL）
4. **forges/ 内部判定过渡态**（迁 pools/ 前不触发 E_MD_xxx）

---

## 3. 阶段 1 — md-bridge 核心实现

### 3.1 8 任务完成情况

| 任务 | 文件 | 行数 | 状态 |
|---|---|---|---|
| T1 | `package.json` | +5 deps | ✅ |
| T2 | `pipeline.ts` | 394 | ✅ |
| T3 | `remark-to-mdast.ts` | 319 | ✅ |
| T4 | `mdast-validator.ts` | 309 | ✅ |
| T5 | `mdast-to-kernel.ts` | 399 | ✅ |
| T6 | `cache.ts` | 300 | ✅ |
| T7 | `reference-checker.ts` | 265 | ✅ |
| T8 | 7 测试文件 | 1,750 | ✅ |

### 3.2 关键 API

```typescript
// Pipeline
runMdPipeline({ content, entity, filePath }) → PipelineOutput

// 5 类 Intent 实体专门 API
parseDomainMd(content, filePath?)     → DomainParseResult
parseBlueprintMd(content, filePath?)  → BlueprintParseResult
parseWorkMd(content, filePath?)       → WorkParseResult

// 校验
validateMdast(content, ctx)           → ValidationResult  // 5 E_MD_xxx
validateMdastStrict(content, ctx)     → ValidationResult  // throw on Fatal

// mdast → Kernel（**核心**）
mdastToKernel({ entity, filePath, content }) → { frozen, meta, convertTime }

// 缓存
getCachedParse(path, contentHash, options?) → CachedParse | null
setCachedParse(mdast, path, contentHash, parseTime, options?)

// 引用分级
parseReferenceTarget(raw, projectRoot?) → ReferenceTarget  // internal/external
checkReference(raw, options?) → ReferenceCheckResult  // 异步可达性
```

### 3.3 关键设计原则（5 个"不"）

1. **不**替换 Langium（共存）
2. **不**修改 Kernel Schema（adapter 模式）
3. **不**改 14 builtin probe 函数体（v0.4 驱动）
4. **不**在 L0-Processor 写 IO 解析（保持"兰姆达真空"）
5. **不**让 L3 直接 import md-bridge（走 barrel）

### 3.4 关键不变量

- Kernel 仍不知 OXL/mdast 存在（adapter 模式）
- md-bridge 在 L1-OXL 内（不依赖 L0-Processor/L2-Work/L3）
- Langium driver 仍默认（向后兼容 v0.2.0）
- 5 类 Intent 资产全部支持 MD 解析

---

## 4. 阶段 2 — .oxn ↔ .md 双轨制

### 4.1 3 文件完成情况

| 文件 | 行数 | 角色 |
|---|---|---|
| `oxl-md-source-hash.ts` | 282 | source hash 管理（防漂移）|
| `oxl-md-compiler.ts` | 447 | mdast → .oxn 编译器 |
| `oxl-md-adapter.ts` | 313 | .oxn ↔ .md 双向 adapter |

### 4.2 关键 API

```typescript
// Source hash 管理
readMapping(mdPath) / writeMapping(mapping) / detectHashMismatch(...)

// 编译
compileMdToOxn(parseResult, { entity, mdContentHash }) → { oxn, name, compiledAt }
compileAndWriteMdToOxn(parseResult, options)            // 编译 + 写盘

// Adapter
adaptOxlMd({
  entity, filePath,
  mdContent?, mdContentHash?,
  oxnContent?, oxnContentHash?,
  mapping?,
}) → { kernel, preferred: '.md' | '.oxn', hashMismatch, compiledOxn }

compileMdFile(mdPath, oxnPath, mdContent, entity)  // 便捷函数
```

### 4.3 真值来源（v0.3 §11.2 锁定）

> **`.md` = 唯一写入入口**。`.oxn` 由 `.md` 自动编译生成，**禁止反向修改**。

### 4.4 输出 .oxn 包含 source hash 防漂移

```oxn
// source_hash: <mdContentHash>
// compiled_at: <ISO timestamp>

domain "OrderContext" {
  term {
    Order 业务实体
  }
}
```

### 4.5 集成测试（30 cases）

| 任务 | tests | 覆盖 |
|---|---|---|
| T9 source-hash | 7 | read/write/delete/list + 3 种 mismatch 检测 |
| T10 compiler | 10 | 5 类实体编译 + source hash 注入 + time stamp |
| T11 adapter | 8 | .md 优先 / .oxn 降级 / hash mismatch / 错误处理 |
| T12 compileMdFile | 5 | 3 实体 + 失败处理 + syncCount |

---

## 5. 阶段 3 — forges/ Intent 迁移

### 5.1 关键发现（与原计划差异）

| 维度 | v0.2 原计划 | v0.3 实际 |
|---|---|---|
| forges/ 文档数 | 51 | **48** |
| 迁移文档 | 51（全量）| **7**（5 Intent + 2 Archive）|
| 保留 forges/ | 0（物理删除）| **41**（外部历史源）|
| 分类方式 | 按文档类型 | 按"是否 OpenXenon 内部决策" |
| forges/ 物理删除 | v0.3 阶段 5 强制 | **永久保留**（废除）|

### 5.2 实际迁移（7 篇）

| Group | 文档 | 目标 |
|---|---|---|
| **Intent A** | intent-pool-design.md | journal/2026-06-13-intent-pool-design-v0.3.0.md |
| **Intent A** | probe-signal-taint-design.md | design/probe-signal-taint-design.md |
| **Intent A** | three-layer-proof-design.md | design/three-layer-proof-design.md |
| **Intent A** | domain-as-ssot-...md | design/domain-as-ssot-doc-binding.md |
| **Intent A** | md-as-canonical-rewrite-design.md | journal/2026-06-18-md-canonical-v1.md（**路线 C v1 基线**）|
| **Archive B** | md-as-friendly-view-...md | _archive/2026-06/...-deprecated.md（**路线 A**）|
| **Archive B** | ddd-terms-decouple-...md | _archive/2026-06/...-deprecated.md（**路线 B**）|

### 5.3 保留 forges/（41 篇）

- 23 篇 top-level（v0.0.27 / v0.1.x / 早期设计）
- 17 篇 sprint 1-9 设计稿
- 1 篇 EXECUTION-ORDER

---

## 6. 关键架构成果

### 6.1 双 driver 切换架构

```
┌────────────────────────────────────────────────────────────┐
│                  L1-OXL（src/oxl/）                        │
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  langium-driver/ │         │   md-bridge/      │         │
│  │  (v0.2.0 兼容)   │         │   (v0.3 新增)    │         │
│  │  • .oxn 解析     │         │  • .md 解析       │         │
│  │  • Langium AST   │         │  • mdast AST      │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                   │
│           ▼                            ▼                   │
│  ┌──────────────────────────────────────────────┐         │
│  │     OxlDriver 抽象（driver-registry）         │         │
│  │  • getActiveDriver() → LangiumOxlDriver       │         │
│  │  • setActiveDriver('mdast') 切换              │         │
│  └──────────────────────────────────────────────┘         │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             ▼
┌────────────────────────────────────────────────────────────┐
│       L0-Kernel SSOT（FrozenBlueprint 等）                │
└────────────────────────────────────────────────────────────┘
```

### 6.2 md-bridge 5 类 E_MD_xxx 校验

| 错误码 | 触发 | 严重 |
|---|---|---|
| `E_MD_INVALID_SYNTAX` | mdast 解析失败 | Fatal |
| `E_MD_MISSING_REQUIRED` | frontmatter.entity/version/name 缺失 | Fatal |
| `E_MD_TYPE_MISMATCH` | entity/status/version 格式错误 | Fatal |
| `E_MD_REFERENCE_BROKEN_FATAL` | 内部 Intent 引用断链（`.openxenon/...`）| Fatal |
| `E_MD_REFERENCE_BROKEN_WARN` | 外部 URL/路径失效 | Warn |
| `E_MD_HASH_MISMATCH` | frozen.json hash 不一致 | Fatal |

### 6.3 双轨制数据流

```
用户/AI 编辑 .md
    ↓
pre-commit hook:
  1. 检测 .md contentHash
  2. 读 .oxn sourceHash（来自 source_hash 注释）
  3. H_md ≠ H_oxn → 自动 .md → .oxn 编译
  4. 更新 .oxn + sourceHash
  5. 写 meta: regenerated-from-md
    ↓
CI 守卫：
  • 拒绝 .oxn 手工修改
  • 强制 .md 重新编译
    ↓
运行时：Kernel 优先读 .oxn（v0.2.0 兼容）
       v0.4+ 可切换优先读 .md
```

### 6.4 L0–L3 兼容性

| 层 | v0.3 兼容性 | 验证 |
|---|---|---|
| **L0-Schema** | 不感知上游（mdast vs Langium）| Zod 验证 |
| **L0-Contract** | 不变 | IAPError 字典稳定 |
| **L0-Processor** | 14 probe 函数体**不动**| adapter 模式 |
| **L1-Infra** | filesystem-async 重用 | fs port |
| **L1-OXL** | **新增 md-bridge/ + langium-driver/**| ✓ 6 files |
| **L2-Builtin** | 14 probe `.oxn` 物理不动 | v0.4 驱动 |
| **L2-Work** | 不变 | ✓ |
| **L3** | 不直接 import md-bridge | 走 barrel |

---

## 7. 关键命题（v0.3 设计哲学）

| 命题 | 文档 |
|---|---|
| **MD-SSOT ≠ 全栈 MD 化，而是 Intent 唯一 MD 化** | [`md-ssot-system.md` v3.2 §1.1](./md-ssot-system.md) |
| **SSOT 不在于格式，而在于控制权** | [`intent-ssot-boundary.md` v1.0 §0](./intent-ssot-boundary.md) |
| **.md = 唯一写入入口**（v0.3 §11.2 锁定）| [`md-ssot-system.md` v3.2 §9](./md-ssot-system.md) |
| **Intent 判定：内部 = Fatal，外部 = Warn** | [`md-ssot-system.md` v3.2 §11.3](./md-ssot-system.md) |
| **Kernel 不知 OXL/mdast 存在** | `md-bridge` 全部走 adapter 模式 |
| **forges/ 永久保留为外部历史源**（废除物理删除）| [`process-forges-deprecation-migration.md`](./process-forges-deprecation-migration.md) |

---

## 8. KPI 对比

| 指标 | v0.2.0 | v0.3 feat | 变化 |
|---|---|---|---|
| 测试通过 | 1393 | **1524** | +131 |
| builtin probe | 14 | 14 | 0（v0.4 驱动）|
| md-bridge 文件 | 0 | 12 | +12 |
| 5 类 E_MD_xxx 错误 | 0 | 5 | +5 |
| OxlDriver 抽象 | 0 | 1 | +1 |
| 池文档 | 5 | **25** | +20 |
| 7 天 TTL 缓存 | 无 | contentHash | 新增 |
| .oxn ↔ .md 互转 | 无 | adapter 模式 | 新增 |
| L0-Processor 14 probe | 不动 | 不动 | 0 |

---

## 9. 累计 6 个 commit 详细

### 9.1 `7f710e2` feat(v0.3): stage 0 launch

18 篇 v0.3 文档 + langium-driver 物理迁移 + md-bridge 抽象入口。
- `src/oxl/langium/` → `src/oxl/langium-driver/`
- `src/oxl/contracts/oxl-driver.ts` (OxlDriver 抽象)
- 5 + 5 + 5 = 15 个文件重命名（R）+ 5 个新文件（A）
- 39 条变更

### 9.2 `1092e4e` refactor(pools): aggregate v0.3 docs into sprints/v0.3-md-ssot/

13 篇 design + 2 audit + 1 journal = 16 篇 v0.3 文档从 `pools/{design,audit,journal}/` 迁移到 `pools/sprints/v0.3-md-ssot/{design,audit,journal}/`
- 17 个 R + 1 M = 18 条变更

### 9.3 `9b36284` build(deps): add unified ecosystem for v0.3 md-bridge (T1)

5 个 unified 依赖 + version 0.3.0-alpha
- unified ^11.0.5
- remark-parse ^11.0.0
- remark-directive ^4.0.0
- remark-frontmatter ^5.0.0
- mdast-util-from-markdown ^2.0.3

### 9.4 `5052b10` feat(oxl): v0.3 stage 1 T2-T8 — md-bridge complete implementation

8 任务 / 6 文件 / ~2300 行 / 97 tests
- T2 pipeline.ts (~200)
- T3 remark-to-mdast.ts (~250)
- T4 mdast-validator.ts (~300) — **5 类 E_MD_xxx**
- T5 mdast-to-kernel.ts (~400) — **核心**
- T6 cache.ts (~150)
- T7 reference-checker.ts (~150)
- T8 5 测试文件 (~1500)
- 11 条变更

### 9.5 `3fe00a9` feat(oxl): v0.3 stage 2 — .oxn ↔ .md dual-track implementation

4 任务 / 3 文件 / ~1500 行 / 30 tests
- T9 oxl-md-source-hash.ts (~280)
- T10 oxl-md-compiler.ts (~420)
- T11 oxl-md-adapter.ts (~340)
- T12 oxl-md-stage2.test.ts (~480, 30 tests)
- 5 条变更

### 9.6 `b6560d6` feat(pools): v0.3 stage 3 — forges/ 7 Intent docs migration

7 篇 Intent 文档从 `forges/` 迁移到 `pools/sprints/v0.3-md-ssot/`
- 5 篇 Intent (journal + design)
- 2 篇 DEPRECATED (_archive/2026-06/)
- 9 条变更

---

## 10. 经验教训

### 10.1 成功

1. **范围最小化**：v3.1 收窄为 2 阶段 6 周，避免长周期重构
2. **driver 抽象先行**：阶段 0 内聚 langium 让阶段 1/2 可干净扩展
3. **adapter 模式**：mdast-to-kernel 完全平行 oxn-adapter，零侵入
4. **增量验证**：每阶段跑全量 1524 tests 守住
5. **pre-commit hook 友好**：source hash 注释而非独立 metadata 文件

### 10.2 失败 / 改进

1. **测试 fixture 复杂度**：部分 md-to-kernel 测试需调整 entity/entityType 字段
2. **forges/ 物理删除误判**：原计划删除，阶段 3 发现 41 篇应保留
3. **`.gitignore` 漏洞**：第 83 行 `pools/*/!(.gitkeep)` 实际未生效
4. **Langium 异步 parse**：adapter 必须处理 Promise<OxnParseResult>
5. **T2 任务拆分**：`Driver` vs `Stage 2` 文件多，先架构后实现是对的

### 10.3 改进项（v0.4.0）

- [ ] 修复 `.gitignore` 第 83 行
- [ ] forges/ 添加 README 说明其"外部历史源"角色
- [ ] pre-commit hook 实施（不在本次 v0.3 范围）
- [ ] 14 builtin probe `.oxn` 渐进迁移到 `.md`
- [ ] md-bridge cache 集成到 L1-Infra（不重复实现）

---

## 11. v0.4.0 推迟清单

| 项 | 来源 |
|---|---|
| 3 scripts（version-aggregate / check-naming / parse-mdast）| 阶段 4 |
| forges/ 51 文档分类脚本 `scripts/migrate-forges.ts` | 阶段 3 修订 |
| `oxn-md-compile` CLI | 阶段 2 实施 |
| `oxn-md-sync` CLI | 阶段 2 实施 |
| `oxn validate` 子命令 | 阶段 4 |
| 14 builtin probe `.md` 化 | 阶段 4 |
| 命名规范 CI 实施 | 命名系统 v1.0 |
| pre-commit hook 实施 | 阶段 2 实施 |

---

## 12. 下一步

**v0.3 状态**：阶段 0+1+2+3 全部完成。**待 v0.3.0 标签 + 发版**。

**可执行选项**：

1. **继续 v0.3 阶段 4**（scripts 简化：version-aggregate / check-naming / parse-mdast）
2. **写 v0.3.0 release 准备**（CHANGELOG / .changes/ 片段 / npm 发版）
3. **修复 `.gitignore` 第 83 行**
4. **创建 PR**：`feat/v0.3-md-ssot` → `dev`
5. **v0.4.0 规划**（14 builtin probe 渐进迁移、CLI 完整化）

---

**记录人**：opencode
**日期**：2026-06-21
**v0.3 阶段 0-3 状态**：✅ 全部完成
**下一步**：v0.3.0 发版准备 或 继续阶段 4
