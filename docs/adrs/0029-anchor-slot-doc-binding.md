# ADR-0029: Anchor / Slot 文档绑定机制（待办）

> **来源**：`docs_tmp/ssot-domain-1.md` (2026-06-17)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → v0.7-emergence RFC 待办
<!-- /allow-version -->
> **影响层**：Docs / Domain

## 决策（提案）

Markdown 文档可声明 **Anchor（锚点）**，Domain OXL 通过 **Slot（插槽）** 引用：

```md
<!-- docs/zh-cn/api.md -->
## 用户注册 API {#api-register}

`POST /register` 必须满足：
- 邮箱格式正确
- 密码长度 ≥ 8

<!-- 域内约束会自动绑定到 @anchor/api-register -->
```

```oxl
domain "MemberContext" {
  term "register" {
    anchor "@api/api-register"     // 引用 docs 锚点
    invariant "邮箱格式正确"         // 自然语言
    invariant "密码长度 ≥ 8"
  }
}
```

## 双重锚点

1. **文档锚点**（`#feature-register`）— 人类导航
2. **术语锚点**（`@term/register`）— 机器校验

## 当前状态

- ❌ 未实现
<!-- allow-version -->
- 🔗 候选落地：v0.7-emergence RFC §Anchor/Slot 段
<!-- /allow-version -->

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-17-ssot-domain-1.md`