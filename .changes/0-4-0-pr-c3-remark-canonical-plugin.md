# 0.4.0 PR-C3 — remark-canonical unified plugin (12 E_MD_* 守卫)

> v0.4 RFC PR-C3: mdast-validator (334 行) → remark-canonical unified plugin
> 把自研校验逻辑切到 unist-util-visit, 输出统一存 tree.data.canonical

## 背景

v0.3.4 md-bridge/mdast-validator.ts (334 行) 用自研 AST 遍历实现 12 E_MD_* 守卫:
- E_MD_INVALID_SYNTAX / E_MD_H1_MISSING / E_MD_H1_MISMATCH
- E_MD_CATEGORY_UNKNOWN / E_MD_DUPLICATE_H3
- E_MD_MISSING_REQUIRED / E_MD_TYPE_MISMATCH
- E_MD_DEPRECATED_SYNTAX / E_MD_REFERENCE_BROKEN_*
- E_MD_LIST_FORMAT_INVALID / E_MD_NESTED_LEVEL_OVERFLOW
- E_MD_HASH_MISMATCH / E_MD_REDUNDANT_FIELD / E_MD_INVALID_RUNTIME_BLOCK

v0.4 PR-C3 目标: 切到 unified-native, 复用 PR-C1 utils + unist-util-visit

## 变更

### 新增 src/oxl/md-pipeline/plugins/remark-canonical.ts (310 行)
- 7 个独立守卫函数 (visitor-style):
  * checkH1 → E_MD_H1_MISSING / E_MD_H1_MISMATCH
  * checkH2Categories → E_MD_CATEGORY_UNKNOWN / E_MD_DUPLICATE_H3
  * checkDeprecatedSyntax → E_MD_DEPRECATED_SYNTAX
  * checkRequiredFields → E_MD_MISSING_REQUIRED
  * checkTypes → E_MD_TYPE_MISMATCH (entity / version / status)
  * checkListFormat → E_MD_LIST_FORMAT_INVALID
  * checkNestingDepth → E_MD_NESTED_LEVEL_OVERFLOW
- 2 个对外 API:
  * `remarkCanonical(options)`: unified plugin (写 tree.data.canonical)
  * `validateCanonical(tree, options)`: 纯函数 (返回 CanonicalResult)
- 强类型: CanonicalErrorCode (15 union) + CanonicalIssue + ENTITY_H2_WHITELIST

### ENTITY_H2_WHITELIST (5 实体各自 H2 白名单)
```
domain    → Terms, Bans, Invariants, Stack       (v0.4 PR-A 加 Stack)
blueprint → Props, Slots
work      → Context, Tasks
task      → Domain, Blueprint, Parts
proof     → Description, Probes
```

### utils.ts 加 extractYamlFromTree (共用)
- 替代 5 个 transformer 各自重复的 frontmatter 解析

## unified plugin 用法

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { parseMarkdown, extractYamlFromTree } from './utils'
import { remarkCanonical } from './plugins/remark-canonical'

const { tree } = parseMarkdown(md) // 内含 frontmatter 提取
remarkCanonical({ entity: 'domain', frontmatter: extractYamlFromTree(tree) })(tree)
const result = tree.data.canonical
// { valid: boolean, errors: CanonicalIssue[], warnings: CanonicalIssue[] }
```

## 兼容性 (compat 期间)

- ✅ v0.3.4 mdast-validator.ts **未删** (validateMdast 路径仍可用)
- ✅ 现有 1727 tests 仍 pass (本次新增 15 个 plugin tests = 1742)
- ✅ 守卫错误码与原 validator 一致
- ⚠ v0.5 PR-C4 收口时, mdast-validator 内部改调 validateCanonical

## 验证

- 37/37 md-pipeline tests pass (PR-C1 10 + PR-C2 12 + PR-C3 15)
- 1764/1764 全仓库 tests pass (was 1749, +15)
- typecheck clean (0 error)

## 后续 (v0.4 RFC §4)

- PR-C4: 收口 — 删 driver-registry / extract-* / oxl-md-* + 切到 work.md
- PR-E: v0.4.0 发布
