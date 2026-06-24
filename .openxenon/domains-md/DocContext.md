---
entity: domain
version: 0.3.0
name: DocContext
---

# Domain: DocContext

> OpenXenon 产品文档站点（VitePress + GitHub Pages）限界上下文：沉淀站点/章节/locale/sidebar 等核心概念，约束术语与不变式

## Terms

### VitePress
- desc: OpenXenon 文档站点的静态站点生成器（Vue + Vite 生态，1.6.4）

### Locale
- desc: VitePress 的国际化概念：每个 locale 是一套独立语言/站点的 URL prefix + 文案 + nav + sidebar

### Sidebar
- desc: VitePress 左侧导航，按 6 桶分组（开始/范式/IAP 三轴/实战/参考/附录）

### IAP
- desc: OpenXenon 核心范式 Intent-Align-Proof 的英文 SSOT 术语，IAP 三轴不翻译（与 glossary.md 锁定一致）

### Frozenjson
- desc: Proof 轴产出的不可篡改证明文件，存放于 .openxenon/proofs/ 或 .openxenon/works/*/tasks/*/

### Workflow
- desc: OpenXenon 的 v1.1 8 阶段流程：init→migrate→create→add-task→validate→lock→run→submit

### PlanLock
- desc: v1.1 新增的 .work 静态门禁卡，含 4 组件 SHA-256 hash（workOxn/workDomains/blueprints/tasks）

### Builtin
- desc: OpenXenon 内置资产（@oxn scope），如 catalog probes、builtin blueprints

### Align
- desc: IAP 第二轴：AI 在 Blueprint slot 边界内编排 Work/Task/Part（vs Intent 与 Proof）

## Bans

### forbidden-constructs
- items:
  - Arsenal
  - Core Engine
  - glo
  - Jekyll
  - MkDocs
  - Docusaurus
  - refs
  - handle
  - ref-logic
- desc: Arsenal, Core Engine, glo, Jekyll, MkDocs, Docusaurus, refs, handle, ref-logic

## Invariants

### inv-1
- value: 站点根路径 / 必须可访问；不在根路径放 source markdown

### inv-2
- value: i18n 必须用对称 prefix 目录（zh-cn/ 与 en/），禁用 root + prefix 混合结构

### inv-3
- value: Sidebar 6 桶固定：开始 / 范式与核心概念 / IAP 三轴 / 实战 / 参考 / 附录

### inv-4
- value: Sidebar 章节文案用中文显示，slug 保持英文（IAP 术语锁定）

### inv-5
- value: URL 必须含 .html 后缀（GitHub Pages 项目页不支持 cleanUrls）

### inv-6
- value: 对外发布只用 dev 分支推送触发 Pages（main 留作 production 槽位）

### inv-7
- value: Pages 部署工作流 docs.yml 的 deploy 守卫仅允许 dev 分支 push 或 workflow_dispatch

### inv-8
- value: feature/* 分支 push 触发 build 验证但不部署

### inv-9
- value: 对外 SSOT 是 docs/zh-cn/*.md（v0.1.0 中文为首发）

### inv-10
- value: 旧 docs/{core,architecture,reference,guides,design,horizon,changelog} 备份到 _archive/，不再作对外引用源

### inv-11
- value: 工程设计沉淀 .openxenon/forges/ v0.1.0 后从 git 移除（不对外）
