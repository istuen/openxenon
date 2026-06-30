# 0.4.0 PR-C1 — md-pipeline 基建 (unified-native)

> v0.4 RFC PR-C1: 引入 unified 生态标准包 + 建 src/oxl/md-pipeline/ 目录
> 取代 md-bridge 自研层 (extract-headings / extract-list-fields / mdast-validator)
> 保留兼容期: 自研层未删, 由 md-pipeline/utils.ts 提供新实现作为 proof-of-concept

## 背景

v0.3.4 md-bridge 10252 行是 hybrid (unified + 自研):
- 用 unified 把 markdown → mdast (✓ 生态标准)
- 但**之后**所有 OpenXenon 逻辑 (提取/验证/编译/驱动) 都是自研
- 自研层重复造了 mdast-util-visit / mdast-util-to-markdown 等生态已有功能

v0.4 RFC PR-C 4 阶段:
- PR-C1 (本 PR): 引入标准包 + 建目录 + utils.ts
- PR-C2: 5 EntityCompilers 改写为 5 unified plugins
- PR-C3: mdast-validator → remark-canonical plugin
- PR-C4: 收口 — 删 driver-registry / extract-* / oxl-md-*

## 变更

### 新增 packages
- `unist-util-visit@^5.1.0` (mdast-util-visit@0.2.0 已 deprecated, 切到 unist 生态)
- `mdast-util-to-markdown@^2.1.2` (md → mdast round-trip)
- `remark-stringify@^11.0.0` (mdast → md)

### 新增文件
- `src/oxl/md-pipeline/index.ts` (统一出口)
- `src/oxl/md-pipeline/utils.ts` (5 utility functions + parseMarkdown + stringifyMarkdown)
- `src/oxl/md-pipeline/__tests__/utils.test.ts` (10 个新测试)

### 新增 utility functions (unified-native)
- `collectHeadings(root)` — 取代 extract-headings.ts 遍历
- `findFirstHeading(root, depth)` — 取代 findH1
- `collectHeadingContexts(root)` — 取代 extractHeadingContexts
- `collectListFields(list)` — 取代 extractListFields 核心
- `parseMarkdown(content)` — md → mdast Root
- `stringifyMarkdown(root)` — mdast → md (round-trip)
- `countNodes(root)` — sanity check

## 兼容性

- ✅ v0.3.4 md-bridge 自研层**未删** (compat 期间, PR-C2-C4 逐步收口)
- ✅ 现有 1727 tests 仍 pass (新增 10 个 md-pipeline tests = 1737)
- ✅ typecheck clean
- ⚠ v0.5 视情况升级到 unified v12/v13 (本 PR 保持 v11)

## 后续 (v0.4 RFC §4)

- PR-C2: 5 EntityCompilers → 5 unified transformer plugins
- PR-C3: mdast-validator → remark-canonical plugin
- PR-C4: 收口 + 切到 work.md
- v0.4.0 发布 (PR-E)

## 验证

- 10/10 md-pipeline tests pass (24 expect calls)
- 1737/1737 全仓库 tests pass (was 1727)
- typecheck clean (0 error)
