# `dev/fix/` — Fix Record 目录

> **情态**：描述性 Doc（回顾性 bug 修复记录）
> **命名**：每个文件以 `<bug-id>-<slug>.md` 命名，对应一个具体的 bug 修复
> **frontmatter**：`bug-id` / `date` / `severity` / `status: fixed`
> **锁定**：RFC-0013 D3（版本相关文档三情态分离）

## 目录说明

`dev/fix/` 存放 OXN 项目**开发者面向的 bug 修复记录**——比 `.changes/` 的 Version Fragment 更详细，含根因分析、调试过程、修复方案选择权衡。仅供开发者和贡献者参考，不对外公开。

## 与 `.changes/` Version Fragment 的区别

| 维度 | `.changes/0-X-Y-*.md`（Version Fragment） | `dev/fix/<bug-id>-<slug>.md`（Fix Record） |
|---|---|---|
| **粒度** | 一个版本的所有变更 | 一个具体的 bug 修复 |
| **受众** | 公开用户 | 开发者 + 贡献者 |
| **内容深度** | 改了什么的摘要 | 根因分析 + 调试过程 + 方案权衡 |
| **可见性** | 公开（README + CHANGELOG.md 引用） | 内部（dev/ 目录不公开） |
| **何时落盘** | 版本转正时 | 修复完成时 |

## 何时创建 Fix Record

- 修复了影响用户的 bug（含 silent fix）
- 涉及多个 commit / 多文件的复杂修复
- 修复方案有多种备选 + 工程师决策权衡值得记录
- 修复揭示了设计缺陷，可能影响未来架构选择

**不创建**的场景：

- 简单 typo 修复（直接 commit 即可）
- 已被 Version Fragment 充分描述的小修复
- 纯测试修复（无用户可见行为变更）

## 文件结构

每个 Fix Record 文件建议包含：

```markdown
---
bug-id: <GitHub issue 编号或内部 ID>
date: YYYY-MM-DD
severity: critical | major | minor
status: fixed
affected-versions: <受影响的版本范围>
---

# Fix: <一句话描述>

## 现象
<用户视角看到了什么>

## 根因
<技术根因分析>

## 备选方案
<考虑过的修复方案 + 权衡>

## 修复方案
<最终选择的方案 + commit refs>

## 验证
<如何证明修复有效>

## 教训
<对未来设计的影响（可选）>
```

## 当前内容

（暂无——Fix Record 目录为 RFC-0013 D3 新建，待后续 bug 修复时启用）

## 参考

- [RFC-0013 D3 版本相关文档三情态分离](../docs/rfc/zh-cn/RFC-0013-versioning-policy.md)
- `.changes/` 目录——回顾性 Version Fragment 存放处