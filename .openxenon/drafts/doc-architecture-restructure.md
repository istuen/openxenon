---
type: draft
created: 2026-07-18
status: active
abstract: |
  OpenXenon 文档架构重构方案：docs/ 目录从语言优先改为主题优先（product|dev|rfc/{zh-cn|en}），
  .openxenon/ 简化为 assets+drafts+works+proofs，pools/ 删除，ADR/RFC 暂存 drafts/rfc/ 待审视。
references:
  - domain-doc-vocabulary-alignment
  - product-architecture-doc-lifecycle
---

# OpenXenon 文档架构重构方案

## 1. 目标结构

### 1.1 顶层目录

```
docs/                              ← OXN 文档中心（topic-first）
├── index.md                       ← 自动重定向 → /product/zh-cn/
├── product/                       ← 产品与使用手册（对外用户）
│   ├── zh-cn/
│   └── en/
├── dev/                           ← 开发手册（贡献者）
│   ├── zh-cn/
│   └── en/
└── rfc/                           ← 决策记录（OXP Proposal 机制）
    └── zh-cn/                     ← 暂无 en

.openxenon/                        ← OXN 工程空间
├── assets/                        ← 项目边界（冻结后不可变）
│   ├── domains/
│   ├── blueprints/
│   ├── stacks/
│   └── roadmaps/
├── drafts/                        ← 草稿中心（替代原 pools/）
│   ├── rfc/                       ← ADR/RFC 暂存（待审视归属）
│   └── ...                        ← 其他项目工作草稿
├── works/                         ← IAP 运行时
├── proofs/                        ← 证明运行时
└── .cache/                        ← 缓存
```

### 1.2 docs/product/zh-cn/ 完整结构

```
product/zh-cn/
├── _index.md
├── introduction.md
├── quickstart.md
├── ai-entry.md
├── faq.md
├── roadmap.md
├── concepts/
│   ├── iap-paradigm.md
│   ├── asset.md
│   ├── work.md
│   ├── proof.md
│   ├── insight.md
│   └── asset-paper.md
├── practice/
│   ├── recipes.md
│   ├── ddd-in-practice.md
│   └── examples/
│       ├── develop-member/
│       ├── explore-dsl/
│       ├── fix-issue/
│       └── onboarding/
└── reference/
    ├── cli-user-guide.md
    ├── glossary.md
    ├── iap-cheatsheet.md
    └── asset-templates/
```

### 1.3 docs/dev/zh-cn/ 完整结构

```
dev/zh-cn/
├── _index.md
├── architecture.md
├── getting-started.md
├── monorepo.md
├── l0-l3-constitution.md
├── oxn-cli.md
├── oxn-engine.md
├── three-tier-docs.md
├── ai-collaboration.md
├── testing.md
├── releasing.md
├── debugging.md
├── conventions.md
└── extending/
    ├── _index.md
    ├── extending.md
    ├── custom-part.md
    ├── custom-probe.md
    ├── dsl-extension.md
    └── skill-authoring.md
```

## 2. Promote 工作流（4 条通路）

```
.openxenon/drafts/xxx.md
    │
    ├── asset-workflow      → .openxenon/assets/{kind}/xxx.md
    ├── doc-prod-workflow   → docs/product/zh-cn/xxx.md
    ├── doc-dev-workflow    → docs/dev/zh-cn/xxx.md
    └── doc-rfc-workflow    → docs/rfc/zh-cn/OXP-XXXX-xxx.md
```

**doc-rfc-workflow 生命周期**：

```
.openxenon/drafts/xxx-design.md     (status: exploring)
    ↓ 评审通过，分配编号
docs/rfc/zh-cn/OXP-00XX-xxx.md      (status: accepted, 冻结)
    ↓ 代码落地
                                     status: implemented
    ↓ 被新 OXP 取代
                                     status: superseded（新 OXP 引用旧 OXP）
```

**OXP 文档规则**：
- 编号递增（OXP-0001, OXP-0002, ...）
- accepted 后核心决策内容冻结，仅可追加 errata 段
- superseded 时在新 OXP 中标注 superseded-by 链
- 不引用 .openxenon/ 内部内容

## 3. 引用规则（3 条）

```
1. docs/ 内部互引  ✅（product↔dev↔rfc 同树，跨语言需走相对路径）
2. docs/ → .openxenon/  ❌（严格隔离）
3. .openxenon/drafts/ → docs/  ✅（仅通过 promote workflow）
```

OXN 开发侧追加规则：
- `proposals/` ↔ `drafts/` 互相引用 ✅（同目录树下）
- `proposals/` → `assets/` ✅（Domain Term 注册）
- `proposals/` → `docs/` ❌（反向由 docs 维护者主动重写）

## 4. 现状数据（迁移前基准）

| 目录 | 文件数 | 处置 |
|---|---|---|
| `docs/zh-cn/product/**` | 27 .md | → `docs/product/zh-cn/` |
| `docs/zh-cn/dev/**` | 18 .md | → `docs/dev/zh-cn/` |
| `docs/zh-cn/index.md` | 1 | → `docs/product/zh-cn/_index.md` |
| `docs/en/**` | 24 .md | → `docs/product/en/`（暂对齐 product 区，dev 待迁移） |
| `docs/zh-cn/product/changelog/**` | 4 | → `docs/product/zh-cn/changelog/` |
| `docs/en/changelog/**` | 1 | → `docs/product/en/changelog/` |
| `docs/index.md` | 1 | 改为自动重定向 |

| 旧 pools/ 子目录 | 文件数 | 处置 |
|---|---|---|
| `pools/drafts/` | 6 活跃 | OXN 开发侧 → `.openxenon/drafts/`；用户侧 → `.openxenon/drafts/`（统一） |
| `pools/issues/` | 3 (全 Fixed) | **删除**（用 GitHub Issues） |
| `pools/journals/` | 2 | **删除**（个人笔记不入 OXN） |
| `pools/spikes/` | 1 | → `.openxenon/drafts/`（加 `kind: spike`） |

| 旧 .openxenon/docs/ 子目录 | 文件数 | 处置 |
|---|---|---|
| `docs/adrs/` | 46 活跃 + 14 Superseded | → `.openxenon/drafts/rfc/`（待审视归属） |
| `docs/rfcs/` | 13 | → `.openxenon/drafts/rfc/`（待审视归属） |
| `docs/drafts/` | 0（未建立） | 新建 → 接 OXN 开发侧草稿 |

## 5. 执行计划

### Phase 0：基建（目录树建立）

| # | 步骤 | 验证 |
|---|---|---|
| 0.1 | 新建 `docs/product/zh-cn/`、`docs/dev/zh-cn/`、`docs/rfc/zh-cn/` | `ls docs/` |
| 0.2 | `git mv docs/zh-cn/product/* docs/product/zh-cn/`（包括 _index.md → index.md） | `ls docs/product/zh-cn/` |
| 0.3 | `git mv docs/zh-cn/dev/* docs/dev/zh-cn/` | `ls docs/dev/zh-cn/` |
| 0.4 | `git mv docs/zh-cn/index.md docs/product/zh-cn/_index.md` | 检查 |
| 0.5 | `git mv docs/en/* docs/product/en/`（含 en/index.md → en/_index.md） | 检查 |
| 0.6 | 删除空 `docs/zh-cn/` 和 `docs/en/` | `ls docs/` |
| 0.7 | 改 `docs/index.md` 为自动重定向到 `/product/zh-cn/` | 浏览器验证 |

**注意**：`_index.md` 是 VitePress 章节首页命名，zh-cn 原来的 `index.md` 需要改名。

### Phase 1：VitePress 配置重写

| # | 步骤 | 关键 |
|---|---|---|
| 1.1 | locale key 从 `zh-cn`/`en` 改为 `/product/zh-cn/`、`/product/en/`、`/dev/zh-cn/`、`/rfc/zh-cn/` | 路径前缀变 topic |
| 1.2 | sidebar 配置全部更新路径前缀（`/zh-cn/product/` → `/product/zh-cn/`） | 见 §6 |
| 1.3 | nav 配置更新（产品手册/开发手册/决策记录 link） | 见 §6 |
| 1.4 | `srcExclude` 更新（适配新路径） | 旧 `core/**` 等保留 |
| 1.5 | `ignoreDeadLinks` 清理（删掉不再需要的 `pools/sprints` 规则，加 `.openxenon/` 全局忽略） | 见 §6 |
| 1.6 | `bun run docs:dev` 验证本地预览 | 浏览器检查 4 大路径 |
| 1.7 | `bun run docs:build` 验证构建 | 无报错 |

### Phase 2：内部链接修复

| # | 步骤 | 验证 |
|---|---|---|
| 2.1 | zh-cn 文档内跨区链接更新（`../../dev/architecture.md` → 相对路径重算） | grep 旧路径 |
| 2.2 | 18 条 `pools/sprints/` 断裂链接处理（删除或改自含描述） | `bun run docs:build` |
| 2.3 | 17 条 `product/ → .openxenon/` 违规引用处理（删除或改自含描述） | `bun run docs:build` |
| 2.4 | changelog 页面链接更新 | 检查 |
| 2.5 | en 站点内 `..\/zh-cn\/` 链接全部清除或改写 | en 侧死链 |

### Phase 3：.openxenon/ 目录重组

| # | 步骤 | 关键 |
|---|---|---|
| 3.1 | 新建 `.openxenon/drafts/` | 目录创建 |
| 3.2 | 新建 `.openxenon/drafts/rfc/` | 待审视 ADR/RFC 暂存区 |
| 3.3 | `git mv .openxenon/pools/drafts/*.md .openxenon/drafts/`（开发侧草稿） | 检查归属 |
| 3.4 | `git mv .openxenon/pools/spikes/probe-converge/* .openxenon/drafts/`（加 kind: spike） | frontmatter 加字段 |
| 3.5 | `git rm .openxenon/pools/issues/`、`journals/`、`spikes/` | 清理 |
| 3.6 | `git rm -r .openxenon/pools/` | 删空目录 |
| 3.7 | `git mv .openxenon/docs/adrs/* .openxenon/drafts/rfc/`（46 活跃 + 14 Superseded） | 编号保留为 ADR-XXXX |
| 3.8 | `git mv .openxenon/docs/rfcs/* .openxenon/drafts/rfc/`（13 RFC） | 编号保留为 RFC-name |
| 3.9 | `git rm -r .openxenon/docs/` | 删空目录 |
| 3.10 | `INDEX.md` 移到 `.openxenon/drafts/rfc/INDEX.md`（待用户审视） | 历史决策索引 |

### Phase 4：项目文档更新

| # | 步骤 | 内容 |
|---|---|---|
| 4.1 | `AGENTS.md` 全量更新路径引用 | § 文档三层架构段重写 |
| 4.2 | `dev/README.md` 更新 | 反映新结构 |
| 4.3 | `docs/dev/zh-cn/three-tier-docs.md` 重写 | 改为新 3 层架构说明 |
| 4.4 | `dev/` 根目录 README 与 `docs/zh-cn/dev/` 关系厘清 | 合并或明确指向 |
| 4.5 | `.openxenon/assets/` 中 Domain 文件 frontmatter 的 relativePath 更新（如有） | 检查 |
| 4.6 | `.openxenon/pools/README.md` 删除（pools 已消亡） | 清理 |

### Phase 5：Domain 词汇补全

| # | 步骤 | 内容 |
|---|---|---|
| 5.1 | `oxn-asset-domain.md` 新增 11 H3 Terms | Blueprint/Workflow/Stack/Domain/Roadmap/External/ThreeBoundaryFramework/FunnelEffect/ArsenalResolver/Anchor/kind-isolation |
| 5.2 | `oxn-engine-domain.md` 新增 12 H3 Terms | TrustChain/AuditChain/Notary/LambdaVacuum/MinimumTrustClosure/FourLayerDeterminism/InformationHiding/Port/PathPort/ResourcePort/CachePort/WorkSnapshot |
| 5.3 | `oxn-proof-domain.md` 新增 3 H3 Terms | ProbeObservation/ProbeVerdict/InterferenceFlag |
| 5.4 | `oxn-work-domain.md` 新增 5 H3 Terms | Loop/EvidenceChainTriple/Trace-before-State/context.md/CriticalHandoff |
| 5.5 | `docs/product/zh-cn/reference/glossary.md` 扩展 | 16 行 → ~45 行 |

**详细 desc 草案**：见 `domain-doc-vocabulary-alignment.md` §6

### Phase 6：Promote Blueprint 定义

| # | 步骤 | 内容 |
|---|---|---|
| 6.1 | `asset-workflow` Blueprint 定义 | 草稿 → 资产的 IAP 流程 |
| 6.2 | `doc-prod-workflow` Blueprint 定义 | 草稿 → product 文档的 IAP 流程 |
| 6.3 | `doc-dev-workflow` Blueprint 定义 | 草稿 → dev 文档的 IAP 流程 |
| 6.4 | `doc-rfc-workflow` Blueprint 定义 | 草稿 → OXP 提案的 IAP 流程（含编号分配） |

### Phase 7：ADR/RFC 逐个审视

| # | 步骤 | 内容 |
|---|---|---|
| 7.1 | 列出 `.openxenon/drafts/rfc/` 全部文件 | 46 + 14 + 13 = 73 个 |
| 7.2 | 逐个标注：promote 到 `docs/rfc/zh-cn/OXP-XXXX-xxx.md` / 归档 / 删除 | 用户决策 |
| 7.3 | promote 的 OXPs 加 status、errata 段 | 统一格式 |
| 7.4 | docs/rfc/zh-cn/_index.md 建立 | 索引页 |

### Phase 8：en 站点结构对齐

| # | 步骤 | 内容 |
|---|---|---|
| 8.1 | `docs/product/en/` 结构对齐 `docs/product/zh-cn/` | 后续版本 |
| 8.2 | `docs/dev/en/` 新建并补齐 | 后续版本 |

## 6. VitePress config.ts 改动预览

### 6.1 locale 定义（核心变化）

```typescript
locales: {
  // 产品手册 · 中文（门户默认）
  '/product/zh-cn/': {
    label: '产品手册',
    lang: 'zh-CN',
    link: '/product/zh-cn/',
    title: 'OpenXenon · 产品手册',
    themeConfig: {
      nav: [
        { text: '产品手册', link: '/product/zh-cn/' },
        { text: '开发手册', link: '/dev/zh-cn/' },
        { text: '决策记录', link: '/rfc/zh-cn/' },
      ],
      sidebar: {
        '/product/zh-cn/': [
          /* 同现有 /zh-cn/product/ 配置，路径前缀改 */
        ],
      },
    },
  },
  // 开发手册 · 中文
  '/dev/zh-cn/': {
    label: '开发手册',
    lang: 'zh-CN',
    link: '/dev/zh-cn/',
    title: 'OpenXenon · 开发手册',
    themeConfig: {
      sidebar: {
        '/dev/zh-cn/': [
          /* 同现有 /zh-cn/dev/ 配置 */
        ],
      },
    },
  },
  // 决策记录 · 中文（初期为空，待 promote）
  '/rfc/zh-cn/': {
    label: '决策记录',
    lang: 'zh-CN',
    link: '/rfc/zh-cn/',
    title: 'OpenXenon · 决策记录',
    themeConfig: {
      sidebar: {
        '/rfc/zh-cn/': [
          { text: '首页', items: [{ text: 'OXP 索引', link: '/rfc/zh-cn/' }] },
        ],
      },
    },
  },
  // 产品手册 · English
  '/product/en/': {
    label: 'English',
    lang: 'en-US',
    link: '/product/en/',
    title: 'OpenXenon · Product Manual',
    themeConfig: {
      sidebar: {
        '/product/en/': [
          /* 同现有 /en/ 配置 */
        ],
      },
    },
  },
},
```

### 6.2 srcExclude 更新

```typescript
srcExclude: [
  'core/**', 'architecture/**', 'reference/**',
  'guides/**', 'design/**', 'horizon/**', '_archive/**',
  'product/en/changelog/**', 'product/en/examples/**', // 暂不构建英文子内容
],
```

### 6.3 ignoreDeadLinks 清理

```typescript
ignoreDeadLinks: [
  // 旧子目录
  /^\.\/architecture\//, /^\.\/reference\//, /* ... */,
  // 历史路径
  /^\.\/zh-cn\//,        // 旧路径（已迁走）
  /^\.\/en\//,           // 旧 en 路径（已迁走）
  // .openxenon/ 全部忽略（隔离规则）
  /\.\.+\/\.openxenon\//,
  // changelog 内部
  /^\.\/changelog\//,
  // AGENTS.md（dev/ 引用）
  /\.\.+\/AGENTS/,
],
```

### 6.4 docs/index.md 自动重定向

```markdown
---
title: OpenXenon
---

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) {
    window.location.replace('/openxenon/product/zh-cn/')
  } else {
    window.location.replace('/openxenon/product/en/')
  }
})
</script>

# OpenXenon

跳转中... [产品手册](/product/zh-cn/) · [Product Manual](/product/en/)
```

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| VitePress 构建失败 | P1 每步后跑 `bun run docs:build` 验证 |
| 内部链接遗漏 | P2 后跑 `bun run docs:build`，死链会报错 |
| en 站点暂不可用 | P0.5 把 en 内容原样放到 `docs/product/en/`，sidebar 用旧配置 |
| ADR/RFC 迁移后引用断裂 | P3 后全量 grep `.openxenon/docs/` 引用并更新 |
| 旧 `redirectFrom` URL 失效 | 用户已确认抛弃旧结构，不需要兼容 |
| GitHub Pages 部署 URL 全变 | 用户已确认抛弃旧结构 |

## 8. 顺序依赖图

```
P0 基建（目录建立）
   ↓
P1 VitePress 配置 ←─┐
   ↓                │
P2 链接修复 ───────┘（依赖 P1 构建验证）
   ↓
P3 .openxenon 重组
   ↓
P4 项目文档更新
   ↓
P5 Domain 词汇补全
   ↓
P6 Promote Blueprint 定义
   ↓
P7 ADR/RFC 逐个审视
   ↓
P8 en 站点对齐（可独立）
```

## 9. 决策汇总

| 决策点 | 决策 |
|---|---|
| 目录结构 | topic-first（product|dev|rfc/{zh-cn|en}） |
| 语言子目录 | 默认中文（zh-cn/）；rfc 暂只有 zh-cn |
| docs/index.md | 自动重定向到 `/product/zh-cn/` |
| 旧 URL 兼容 | 抛弃（用户确认旧结构太久） |
| pools/ | 删除（issues→GitHub, journals→个人笔记, spikes→drafts） |
| .openxenon/docs/ | 删除（全部移入 drafts/rfc/ 待审视） |
| ADR/RFC 处置 | 先全部入 drafts/rfc/，逐个审视归属 |
| docs/rfc/ 内容 | OXP Proposal 机制，统一 RFC+ADR |
| OXP 文档可改性 | accepted 后核心冻结，仅可追加 errata 段 |
| en 站点 | 暂对齐 product/，dev/ 待后续 |

## 10. 关联草稿

- `domain-doc-vocabulary-alignment.md` — Domain 词汇补全详细方案（31 个 H3 Terms）
- `product-architecture-doc-lifecycle.md` — 最新产品/架构设计 + ADR/RFC 除噪分析
