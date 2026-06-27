# 0.4.0 PR-A — domain ## Stack H2 (Q2 软推荐)

> v0.4 RFC PR-A 落地: 工程师对 AI 设定的技术环境约束（语言/运行时/lint 工具）
> 内联到 domain.md 的 `## Stack` H2 section, 软推荐 (不填不报错).

## 背景

v0.3.4 的 domain H2 白名单只含 Terms / Bans / Invariants 3 类业务约束.
v0.4 RFC 决定把技术栈 (TypeScript/Bun/biome 等) 作为 Intent 语义约束内联到
domain, 而非新建 stacks/ 目录 (避免 5 类实体膨胀成 6 类).

## 变更

- `src/oxl/md-bridge/compilers/domain-compiler.ts`
  - `DOMAIN_CATEGORIES` 加 'Stack' (4 类)
  - parse() 提取 ## Stack → stack[] (含 H3 + fields)
  - validate() 不报 E_MD_CATEGORY_UNKNOWN for Stack (软推荐)

- `src/oxl/md-bridge/__tests__/compilers/domain-compiler.test.ts`
  - 4 个新测试: Stack 接受 / Stack+Terms 共存 / parse 提取 Stack / 缺 Stack 空数组

- `docs/zh-cn/intent.md` + `docs/en/intent.md`
  - 新增 ## Stack 章节 (字段表 + 子分类扩展 + blueprint 引用继承)

## 用户动作

- 无 API 变化
- 可选: 在自己的 domain.md 加 ## Stack section
  (示例: `.openxenon/domains-md/ExampleStackDomain.md` 本地 demo)

## 后续 (v0.4 RFC)

- PR-B (Q5 + Q4-A): task 内联 work.md + proof.md 快照
- PR-C1 (unified 基建): 引入 mdast-util-* 标准包
