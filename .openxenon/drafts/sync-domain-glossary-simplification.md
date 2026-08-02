# sync-domain-glossary 脚本精简 + 多 Domain 链接方案

> **来源**：2026-08-01 `/grilling` session Round 4（RFC-0017 实施后）
> **作者**：opencode（与 user 协作，2026-08-01）
> **状态**：设计草案，待评估
> **目标**：`scripts/sync-domain-glossary.ts` 与 `docs/product/zh-cn/concepts/glossary.md` 输出形态调整

---

## 0. 背景

RFC-0017 Phase 2 实施后，`scripts/sync-domain-glossary.ts` 已具备基础能力（9 Domain / 157 term / 140 去重 / 11 处冲突 advisory）。但用户提出两点设计调整：

1. **sync 脚本的职责边界过宽**：当前实现了 `isContradicting` 函数做 Jaccard + 反义词的语义冲突检测，**这不属于 sync 职责**——冲突判定是工程师 + AI 的责任
2. **glossary.md 输出形态不完整**：多 Domain 视角只列出 Domain 名（如 `oxn-work-domain: desc`），未生成可点击链接；缺少 `source:` 字段等追溯信息

## 1. sync 职责边界重新定义

| 旧职责 | 新职责 |
|---|---|
| 提取 `## Terms:` 段 H3 | **保留** |
| 合并去重（同 name → 列出多 Domain） | **保留** |
| 冲突检测（`isContradicting`） | **删除** |
| `E_GLOSSARY_DUPLICATE_TERM` advisory | **删除** |
| `--strict`（字面 desc 完全一致） | **保留为 sanity check** |
| `viewpoints` 子项（多 Domain 视角） | **改为 `domains:` 列表 + markdown 链接** |
| 字母排序 + slug 生成 | **保留** |
| Domain 文件注入 `glossary-ref` | **保留** |

### sync 不应承担的职责（明确划线）

- ❌ **冲突判定**：是否矛盾由工程师 + AI 在 Domain 文件层面裁决
- ❌ **NLP 式相似度计算**：Jaccard / 编辑距离 / 反义词检测
- ❌ **概念边界设计**：Probe 在 Engine vs Work 是否该拆分为两个 term——这是 RFC 立项问题

## 2. glossary.md 输出形态调整

### 旧格式（已废弃）

```markdown
### Probe
- desc: OXN 内置探针（物理观测 + 客观结果），由 L1-Infra Provider 执行 + L0-Kernel 产出 ProbeOutcome
- 视角:
  - oxn-work-domain: 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致
```

### 新格式（推荐）

```markdown
### Probe

> **glossary-ref anchor**: #probe

- domains:
  - [oxn-proof-domain](../../../openxenon/assets/domains/oxn-proof-domain.md#probe) — OXN 内置探针（物理观测 + 客观结果），由 L1-Infra Provider 执行 + L0-Kernel 产出 ProbeOutcome
  - [oxn-work-domain](../../../openxenon/assets/domains/oxn-work-domain.md#probe) — 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组

> 多 Domain 定义说明：同名 term 在多个 Domain 视角下可能有不同描述。**冲突判定由工程师 + AI 负责**（不在 sync 职责内）。
```

### 关键变化

| 项 | 旧 | 新 |
|---|---|---|
| 多 Domain 列表字段 | `视角:` | `domains:` |
| Domain 来源 | 仅列 name（文本） | markdown 链接到 `domains/oxn-X-domain.md#term-slug` |
| 冲突标注 | `⚠️ 冲突：...` 行 | **删除** |
| 冲突脚注 | （无） | 加通用说明："冲突判定由工程师 + AI 负责" |
| `glossary-ref anchor` | （无） | 显式标注，便于 VitePress 锚点稳定性 |

## 3. sync 脚本修订细节

### 3.1 删除的代码

```typescript
// 全部删除
function isContradicting(root: string, sub: string): boolean { ... }
function extractTokens(s: string): string[] { ... }
function firstSentence(desc: string): string { ... }  // 仍可保留作 --strict 用

// 简化 MergedTerm 类型
interface MergedTerm {
  name: string
  slug: string
  domains: Array<{ domain: string; desc: string; isRoot: boolean }>
  // 删除 conflictDomains 字段
}

// 简化 mergeTerms 返回
function mergeTerms(domains: Domain[]): {
  merged: MergedTerm[]
  // 删除 conflicts 数组
}

// 简化 main() 输出
// 删除 ⚠️ 冲突检测整段
```

### 3.2 保留的代码

```typescript
function toSlug(h3Text: string): string { ... }      // 保留
function escapeAngleBrackets(s: string): string { ... } // 保留（防 Vue 解析）
function loadAllDomains(): Domain[] { ... }           // 保留
function findRoots(domains: Domain[]): Set<string> { ... } // 保留（决定 isRoot）
function renderGlossary(merged: MergedTerm[], today: string): string { ... } // 改写
function injectGlossaryRef(domains: Domain[], merged: MergedTerm[]): Map<...> { ... } // 保留
```

### 3.3 `--strict` 语义调整

| 旧语义 | 新语义 |
|---|---|
| 同 term 多 Domain 且 desc 首句不一致即报错 | 同 term 多 Domain 且 desc **完整字符串完全相同**才报错（防止 root/sub 错配） |

### 3.4 renderGlossary 重写片段

```typescript
function renderGlossary(merged: MergedTerm[], today: string): string {
  const lines: string[] = [
    '---',
    'title: 术语表',
    'entity: glossary',
    'generated-by: scripts/sync-domain-glossary.ts',
    `synced-at: ${today}`,
    '---',
    '',
    '# 术语表',
    '',
    '> 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。',
    '> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。',
    '> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。',
    '>',
    '> **多 Domain 定义**：同名 term 在多个 Domain 视角下可能有不同描述。冲突判定由工程师 + AI 负责，sync 脚本仅如实合并。',
    '',
    '## 字母速查',
    '- [A-E](#a-e)',
    '- [F-L](#f-l)',
    '- [M-R](#m-r)',
    '- [S-Z](#s-z)',
    '',
    '<!-- SYNC:START -->',
  ]

  // 分组（同前）
  const groups: Record<string, MergedTerm[]> = { 'A-E': [], 'F-L': [], 'M-R': [], 'S-Z': [] }
  for (const t of merged) {
    const first = t.name[0]!.toUpperCase()
    if (first >= 'A' && first <= 'E') groups['A-E']!.push(t)
    else if (first >= 'F' && first <= 'L') groups['F-L']!.push(t)
    else if (first >= 'M' && first <= 'R') groups['M-R']!.push(t)
    else groups['S-Z']!.push(t)
  }

  for (const [groupName, items] of Object.entries(groups)) {
    if (items.length === 0) continue
    lines.push(`## ${groupName}`, '')
    for (const t of items) {
      lines.push(`### ${t.name}`, '')
      lines.push(``, `> **glossary-ref anchor**: #${t.slug}`, ``, `- domains:`)
      for (const d of t.domains) {
        const marker = d.isRoot ? ' ⭐' : ''
        lines.push(
          `  - [${d.domain}](.${DOMAINS_RELATIVE_PATH}/${d.domain}.md#${t.slug})${marker} — ${escapeAngleBrackets(d.desc)}`
        )
      }
      lines.push('')
    }
  }

  lines.push('<!-- SYNC:END -->')
  lines.push('')
  return lines.join('\n')
}
```

### 3.5 常量定义

```typescript
const DOMAINS_RELATIVE_PATH = '/openxenon/assets/domains'
```

注意：链接路径以 `glossary.md` 视角出发，需向上 1 层再向前——实际相对路径是 `../../openxenon/assets/domains/`。VitePress 在构建时会把 `/openxenon/...` 解析为正确 URL，需根据实际部署 base 调整。

## 4. 影响评估

### 4.1 文件影响

| 文件 | 影响 |
|---|---|
| `scripts/sync-domain-glossary.ts` | 大幅精简（删 ~50 行） |
| `docs/product/zh-cn/concepts/glossary.md` | 输出形态变化（重跑 sync 即可） |
| `.openxenon/assets/domains/*.md` | 无影响（glossary-ref 字段保留） |

### 4.2 已有冲突列表处理

| 冲突 | sync 行为变化 |
|---|---|
| PlanLock / Roadmap / OXL / Probe / Part | **不再报错**，如实合并为多 Domain 列表 |
| OXN Engine / Infra / Daemon / Insight / Proof / Work | **不再报错**，如实合并 |
| 所有 11 处 | 全部如实合并，工程师 + AI 自行裁决 |

### 4.3 check-doc-boundary.ts 影响

`concepts-no-term-redef` 规则检测 `### ` slug 碰撞。glossary.md 自身就有 `### Probe` 等 term 标题，但它是**生成产物**（SYNC:START/END 内），不在 concepts/ 目录下，所以规则不触发。**无影响**。

`docs-product-no-meta` 规则：glossary.md 在 `docs/product/zh-cn/concepts/`，**未**引用 `.openxenon/` 内部路径（链接到 `/openxenon/assets/domains/oxn-X-domain.md` 是 URL 形式，非相对路径）——需验证。

实际上，sync 生成的链接是绝对 URL `/openxenon/assets/domains/...`，VitePress 在站点构建时会作为外部链接处理，**不会触发** `docs-product-no-meta`（该规则用相对路径正则 `^\.openxenon\/`）。

### 4.4 glossary.md frontmatter `entity: glossary` 字段

旧多文件 glossary 的 `source:` 字段（标记出处 Domain 文件）当前未保留。**建议保留为新增字段**：

```yaml
---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-01
source-domains:
  - oxn-domain
  - oxn-asset-domain
  - oxn-engine-domain
  - oxn-work-domain
  - oxn-proof-domain
  - oxn-insight-domain
  - oxn-cli-domain
  - oxn-project-domain
  - oxn-draft-domain
---
```

`source-domains` 字段列出所有参与同步的 Domain 文件，便于读者追溯。

## 5. 验证项

- [ ] sync 脚本删除 `isContradicting` / `extractTokens` / `firstSentence`（仅保留作为 `--strict` 内部工具）
- [ ] `MergedTerm.conflictDomains` 字段删除
- [ ] `mergeTerms` 不返回 `conflicts` 数组
- [ ] main() 不输出 ⚠️ 冲突检测段
- [ ] glossary.md 重跑后输出新格式（domains 列表 + 链接 + 无冲突标注）
- [ ] `--strict` 行为变化：完整 desc 字符串相等才通过
- [ ] 9 个 Domain 文件的 glossary-ref 字段保留正确性
- [ ] 11 处"原冲突"全部如实合并为多 Domain 列表
- [ ] `bun run typecheck` 通过
- [ ] `bun scripts/check-doc-boundary.ts` 0 violations
- [ ] `bun test` 通过

## 6. 待用户确认

1. **链接形式**：是否用绝对 URL `/openxenon/assets/domains/...`（VitePress 友好），还是相对路径 `../../openxenon/assets/domains/...`（更通用）
2. **`--strict` 新语义**：完整 desc 字符串相等才通过——是否接受这一简化
3. **`source-domains` frontmatter 字段**：是否添加
4. **冲突表述的脚注位置**：放在文件顶部导读段还是每 term 下——建议文件顶部导读（避免冗余）

## 7. 不在本草案范围

- ❌ 11 处"原冲突"的裁决（PlanLock / Roadmap / OXL / Probe / Part 是否拆 term）—— 独立 RFC 立项
- ❌ 6 处"视角补全"的 desc 调平—— 独立 RFC 立项
- ❌ Domain 文件 desc 内容修改—— 仍是工程师 + AI 责任