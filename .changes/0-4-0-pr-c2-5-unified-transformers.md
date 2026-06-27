# 0.4.0 PR-C2 — 5 EntityCompilers → 5 unified transformer plugins

> v0.4 RFC PR-C2: md-bridge 5 个自研 EntityCompiler 改写为 unified-native 插件
> 实体抽取逻辑完全切到 mdast + unist-util-visit, 保持现有 IR 形状 (compat)

## 背景

v0.3.4 md-bridge/compilers/{domain,blueprint,work,task,proof}-compiler.ts
共 1817 行, 5 个 EntityCompiler 类都遵循同一模式:
- parse() 走 mdast + extractHeadingContexts + extractListFields
- 自研遍历逻辑 (for 循环 + 手动 AST 判断)

v0.4 PR-C2 目标: 把 parse() 的核心抽出逻辑切到 unified-native,
复用了 PR-C1 的 utils.ts (collectHeadingContexts / collectListFields / parseMarkdown).

## 变更

### 新增文件 (src/oxl/md-pipeline/transformers/)
- domain.ts (167 行) — extractDomainIR + remarkDomainExtractor
  - 含 Stack 分类 (PR-A 落地)
- blueprint.ts (161 行) — extractBlueprintIR + remarkBlueprintExtractor
- work.ts (175 行) — extractWorkIR + remarkWorkExtractor
  - 含 proofs [...] (v0.3 T11 grammar)
- task.ts (139 行) — extractTaskIR + remarkTaskExtractor
- proof.ts (138 行) — extractProofIR + remarkProofExtractor
  - 含 proofs-target-work (v0.4 PR-B Q4-A 落地)
- index.ts (统一出口, 36 行)

### 新增 utils.ts 函数
- extractYamlFromTree(tree) — 从 mdast yaml 节点提取 frontmatter
  (替代 5 个 compiler 各自重复的 extractFrontmatterFromTree)

### parseMarkdown 签名升级
- 旧: `parseMarkdown(content) → Root`
- 新: `parseMarkdown(content) → { tree, frontmatter }`
- remark-frontmatter v11 不解析 yaml 内部数据, 我们在 parseMarkdown
  内部 processor.runSync + 简单正则提取 key-value

## 5 unified plugin 设计模式

每个 transformer 都提供:
1. **纯函数** `extractXxxIR(root, frontmatter) → XxxIR`
   - 业务代码直接调 (无需 unified pipeline)
2. **unified plugin** `remarkXxxExtractor() → (tree) => void`
   - 写 `tree.data.xxx`, 可链入 unified processor
3. **IR 类型** `XxxIR` (typed, 静态导出)
   - TypeScript 强类型, IDE 自动补全

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { remarkDomainExtractor, extractDomainIR } from './transformers'

// 方式 1: 纯函数 (推荐)
const { tree, frontmatter } = parseMarkdown(md)
const ir = extractDomainIR(tree, frontmatter)

// 方式 2: unified plugin
const tree2 = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkDomainExtractor())
  .parse(md)
processor.runSync(tree2)
const ir2 = tree2.data.domain
```

## 兼容性 (compat 期间)

- ✅ v0.3.4 md-bridge 5 个 EntityCompiler **未删** (compile() 路径仍可用)
- ✅ parse() 仍可被现有 1727 tests 调用 (本次新增 12 个 transformers tests = 1739)
- ✅ 提取出的 IR 与 EntityCompiler.parse() 行为等价
- ⚠ v0.5 PR-C4 收口时, 5 个 EntityCompiler.parse() 改调 extractXxxIR

## 验证

- 22/22 md-pipeline tests pass (PR-C1 10 个 + PR-C2 12 个新)
- 1749/1749 全仓库 tests pass (was 1737)
- typecheck clean (0 error)

## 后续 (v0.4 RFC §4)

- PR-C3: mdast-validator → remark-canonical plugin
- PR-C4: 收口 — 删 driver-registry / extract-* / oxl-md-* + 切到 work.md
- PR-E: v0.4.0 发布
