---
entity: domain
version: 0.1.0
name: DocMdDomain
abstract: |
  MD 文档编写通用术语 + 路径约束。OXN 项目消费者 onboarding 5 起手 Asset 之一。
  覆盖任何使用 MD 撰写文档的项目（不限语言/框架），定义章节、插图、代码块、
  链接、引用 5 类核心术语；禁止硬编码路径、禁止遗留 TODO 标记。
references: []
citations: 0
synced-at: 2026-08-04
---

# Domain: DocMdDomain

> MD 文档编写通用领域。OXN 内置 5 起手 Asset 之一（ADR-0089 D1）。
> 适用场景：项目消费者使用 OXN 引导后的文档编写 Domain。
> 边界声明：仅覆盖 MD 文档编写的"通用"约定，不指向 OXN 自身术语体系。

## Terms

### Section
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#section
- desc: H2 划分的文档单元；H3 为子节；H1 仅用于文档标题（每文档唯一）。

### Figure
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#figure
- desc: 嵌入 `<figure>` 标签或 `![alt](src)` 语法的图像；alt 文本必填（无障碍）。

### CodeBlock
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#codeblock
- desc: 围栏代码块（\`\`\`language 开头）；language 必填以启用 lint 校验。

### Link
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#link
- desc: 文档内可点击引用；分 3 类：内链（相对路径）、外链（http(s)://）、锚链（#anchor）。

### Citation
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#citation
- desc: 方括号 `[n]` 引文 + `## References` 段；n 为纯数字；同一文档 n 唯一。

### ProjectRoot
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#projectroot
- desc: 项目根目录（仓库根或 `.openxenon/` 父目录）；所有 MD 路径引用基于此。

### RelativePath
- glossary-ref: /openxenon/assets/domains/doc-md-domain.md#relativepath
- desc: 相对路径；必须从当前 MD 文件所在目录出发，禁止 `../` 跨多层。

## Bans

### forbidden-constructs
- items:
  - hardcoded-path
  - todo-marker
  - absolute-path
  - cross-multi-level-relative
  - missing-alt
  - missing-language-tag
- desc: |
  - `hardcoded-path`：禁止硬编码仓库绝对路径（如 `/Users/.../src/`），必须用基于 ProjectRoot 的引用
  - `todo-marker`：禁止遗留 `TODO` / `FIXME` / `XXX` 标记；必须用 RFC-XXXX 后续追踪
  - `absolute-path`：MD 文档内禁止绝对路径
  - `cross-multi-level-relative`：禁止 `../../..` 跨多层相对路径
  - `missing-alt`：图片必须含 alt 文本（无障碍 + md-pipeline 校验）
  - `missing-language-tag`：代码块必须指定 language（启用 lint + 语法高亮）

## Invariants

### inv-1: section-h2-rule
- value: 文档 H1 仅用于标题（每文档唯一）；H2 为节；H3 为子节；H4 及以下不支持。

### inv-2: codeblock-language-required
- value: 围栏代码块必须含 language 标识（\`\`\`ts / \`\`\`bash 等）；缺失 → md-stack lint 失败。

### inv-3: link-validated-at-precommit
- value: 所有链接（内/外/锚）必须通过 `markdown-link-check`（md-stack 工具链）；失败 → pre-commit 阻断。

### inv-4: citation-numbering-unique
- value: 同一文档内引用编号 n 唯一；数字连续从 1 开始；`## References` 段按编号排列。
