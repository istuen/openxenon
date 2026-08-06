---
id: anchor-slot
theme: Anchor slot 机制
priority: medium
status: planned
created-at: 2026-07-23
scheduled-version: ~
synced-at: 2026-07-27
note: |
  从 dev/versions/0-7-2-anchor-slot.md 迁移 (2026-07-27 grilling session)。
  移除 version 绑定，进入规划池备选。
---

# 0.7.2 — Anchor / Slot 文档双向绑定

> **v0.7.2 主题**：Markdown 文档锚点（Anchor）+ Domain 术语插槽（Slot）双向绑定。让 Insight `evidenceChain` 一步反查到 `docs/zh-cn/api.md#api-register`，让 Domain 校验自动检查文档 orphan，让 Hall Asset 影响图直接展示"哪些 docs 章节锚定此 Asset"。
>
> **前提**：v0.7.0 + v0.7.1。
> **核心 RFC**：[v0.7.2 Anchor/Slot RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.2-anchor-slot-rfc.md) 📝 Draft

## 核心变化

### 1. 双向锚点契约

#### 1.1 文档侧（Anchor）

Markdown H2 / H3 可声明 `{#anchor-id}` slug：

```markdown
<!-- docs/zh-cn/api.md -->
## 用户注册 API {#api-register}

`POST /register` 必须满足：
- 邮箱格式正确
- 密码长度 ≥ 8
```

#### 1.2 域侧（Slot）

Domain OXL term 引用 anchor：

```oxl
domain "MemberContext" {
  term "register" {
    anchor "@doc/api-register"          // 物理引用 docs 锚点
    invariant "邮箱格式正确"              // 自然语言
    invariant "密码长度 ≥ 8"
  }
}
```

#### 1.3 双向校验（编译期）

```bash
oxn domain validate MemberContext     # 检查 @doc/<id> 是否存在
oxn docs validate                     # 检查文档中 {#<id>} 是否被 Domain 引用
```

任一缺失：
- 文档侧无引用 → `E_DOMAIN_SLOT_DANGLING`（warn）
- 域侧无引用 → `E_DOC_ANCHOR_ORPHAN`（warn）

### 2. Insight 反查链路

`packages/engine/src/Insight/graph-builder.ts` 扩展：

```mermaid
graph LR
  T[register term] -.->|anchor| ANCHOR[api-register]
  ANCHOR -.->|docs| DOC[api.md#api-register]
```

Insight 详情页直接显示：

```
Insight "密码不能明文存储"
  → evidence → Domain term "register"
            → Slot @anchor/api-register
                → docs/zh-cn/api.md#api-register  [click]
```

### 3. Hall AssetsPanel 升级

`/hall/assets/<name>/` 详情页加 "Anchored Docs" 卡片：

```
MemberContext
├── Anchored Docs (3)
│   ├── docs/zh-cn/api.md#api-register
│   ├── docs/zh-cn/security.md#password-storage
│   └── docs/zh-cn/onboarding.md#email-validation
├── Downstream (2)
└── Upstream (1)
```

### 4. `oxn docs validate` CLI

```bash
oxn docs validate                     # 全文档扫描 + 双向引用检查
oxn docs validate docs/zh-cn/api.md   # 单文档检查
```

### 5. 错误码扩展

```typescript
ExecErrorCode = {
  // ... v0.7.1 已有
  E_DOC_ANCHOR_ORPHAN: 'E_DOC_ANCHOR_ORPHAN',
  E_DOMAIN_SLOT_DANGLING: 'E_DOMAIN_SLOT_DANGLING',
}
```

## 物理布局（v0.7.2 新增/修改）

### 新增

```
packages/engine/src/oxl/md-bridge/
├── anchor-extractor.ts             # 文档锚点提取
└── __tests__/anchor-extractor.test.ts  # 6 cases

packages/engine/src/Insight/
├── slot-resolver.ts                # Anchor ↔ Slot 双向解析
└── __tests__/slot-resolver.test.ts     # 8 cases

packages/cli/src/commands/
├── docs-validate.ts                # oxn docs validate
└── __tests__/docs-validate-e2e.test.ts  # 4 cases
```

### 修改

- `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts` — 加 anchor 字段解析
- `packages/engine/src/Insight/graph-builder.ts` — Anchor 反查节点
- `packages/cli/src/commands/domain.ts` — `validate` 子命令加 anchor 完整性检查
- `packages/cli/src/errors/iap-error.ts` — 新增错误码
- `docs/.vitepress/theme/components/AssetsPanel.vue` — "Anchored Docs" 卡片

## 测试 / 构建结果（目标）

- **typecheck**: 0 errors ✅
- **测试**: ≥ 2,099 pass（v0.7.1 末 2,075 + 24）
- **docs:build**: 484 docs 文件 + Anchor 索引正常

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Anchor ID 冲突 | 中 | 中 | slug 唯一性校验（编译期） |
| 文档重命名导致 anchor 失效 | 中 | 中 | 重命名时自动检测 + 警告 |
| Hall 渲染双链断裂 | 低 | 低 | 链接存在性校验（health check） |

## v0.7.2 不做

- 自动生成 anchor ID（用户手工标注）
- Anchor 反向查找图谱（v0.8.0 Asset 知识库范围）
- 跨项目 anchor 引用（v0.8 Skill 远程 Registry）

## 迁移路径（开发者视角）

```bash
# v0.7.1 → v0.7.2
bun install
bun run build

# 给现有文档加 anchor
$EDITOR docs/zh-cn/api.md
# ## 用户注册 API {#api-register}

# 在 Domain 中引用
$EDITOR .openxenon/assets/domain/MemberContext.oxn
# term "register" { anchor = "@doc/api-register"; ... }

# 校验
oxn docs validate
oxn domain validate MemberContext
```

## 参考

- [v0.7.2 Anchor/Slot RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.2-anchor-slot-rfc.md) 📝 Draft
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) §2.6 Asset 影响图
- [v0.7+ Roadmap Overview](../../.openxenon/pools/sprints/v0.7-plus-roadmap/overview.md) §2 v0.7.2 阶段
- [ADR-0029 Anchor / Slot 文档绑定机制](../../.openxenon/docs/adrs/0029-anchor-slot-doc-binding.md)