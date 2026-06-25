# 0.4.0 — Asset Unify-MD Refactor 收官

> **v0.4 主题**：把 v0.3 的 `:::intent{...}` 容器指令 + langium/mdast 双 driver
> 切到 unified-native MD 范式（5 类实体 × 1 套解析路径 × 资产层减法）

## 核心变化（用户视角）

### Domain — 可选 `## Stack` 分类

```markdown
## Stack  (软推荐, 不填不报错)

### runtime
- language: typescript
- runtime: bun
- version: ">=1.1.0"

### linter
- tool: biome
- config: biome.json
```

Stack 表示"工程师对 AI 设定的技术环境约束"（语言/运行时/lint 工具）。blueprint 通过 `domain: <name>` 引用自动继承，blueprint 不重复定义。

### Work — task 内联 + proof 快照

**Proof 证据闭环**：`oxn proof run <proof>` 自动把 `work.md` 拷贝成 `proof.md`（immutable, 0o444）+ 写 `work-hash.txt` (SHA-256)。`oxn proof verify` 检查 hash drift。

```bash
oxn proof run my-proof   # 自动快照 + 跑 probe + 写 frozen.json
oxn proof verify my-proof # 检查 work.md 是否被改动
```

**work.md 单一文件**：`oxn work compile <w>` 把 work.oxn 编译为 MD canonical（含 `## Tasks` H2 + H3 = task 列表）。`oxn work migrate-md --all` 批量处理 30 works。

### 内部架构 — unified-native (.md 解析)

`.md` 解析从 hybrid (unified + 自研 md-bridge) 切到 **unified-native**：
- 引入 `unified` + `remark-parse` + `remark-stringify` + `unist-util-visit` + `mdast-util-to-markdown` 等生态标准包
- 删 649 行自研层（`extract-headings.ts` / `extract-list-fields.ts` / `driver-registry.ts`）
- 5 EntityCompilers 切到 unified transformer plugins (`extractXxxIR(root, frontmatter)`)
- 12 E_MD_* 守卫切到 `remark-canonical` unified plugin
- 单文件 `src/oxl/driver.ts` 取代 langium/mdast driver 切换

## 数字

| 维度 | v0.3.4 | **v0.4.0** | Δ |
|---|---|---|---|
| tests pass | 1707 | **1726** | +19 |
| md-bridge 行数 | 10252 | **9603** | -649 |
| `src/oxl/md-pipeline/` | — | **~2000** | 新建 |
| unified 生态依赖 | 4 | **8** | +4 |
| E_MD_* 错误码 | 12 | 12 | 0 |
| 错误码总量 | 20 | 20 | 0 |
| npm 版本数 | 6 | **6+1** | +1 (this) |

## 兼容性

- ✅ v0.3.4 用户平滑升级（无需改任何 .oxn/.md）
- ✅ `extractHeadingContexts` / `extractListFields` / `findH1` 旧 API 函数名保留为 alias
- ✅ `driverRegistry` 引用从 barrel 移除（但兼容命名 `getActiveDriver` / `setActiveDriver` 仍可用）
- ⚠ v0.5 视情况：完全删除 md-bridge 自研层 / 升 unified v12/v13 / work.ts 切到读 work.md

## 8 个 PR 列表（v0.4 历程）

| # | Commit | PR | 内容 |
|---|---|---|---|
| 1 | fa8a3c5 | PR-A | domain `## Stack` H2 (Q2 软推荐) |
| 2 | 5998dbc | PR-B Q4-A | proof 持有 work.md 不可变快照 |
| 3 | f31522e | PR-B Q5 foundation | `oxn work compile <w>` 命令 |
| 4 | 17c71ec | PR-B.5 | `oxn work migrate-md` + 30 works 批量迁移 |
| 5 | 648395b | PR-C1 | md-pipeline 基建 (unified + 5 utility functions) |
| 6 | 702e851 | PR-C2 | 5 unified transformer plugins |
| 7 | f871d1b | PR-C3 | remark-canonical unified plugin (12 E_MD_*) |
| 8 | 19a86cb | PR-C4 | self-developed layer 收口（md-bridge → md-pipeline）|

## RFC

完整 v0.4 设计稿：[`.openxenon/pools/sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md`](../sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md)

## 验证

- 1726/1726 全仓库 tests pass
- typecheck clean
- 30/30 works migrate-md 成功（work.md 含完整 task + part 内联）
- proof.md snapshot + hash drift verify 端到端通过
