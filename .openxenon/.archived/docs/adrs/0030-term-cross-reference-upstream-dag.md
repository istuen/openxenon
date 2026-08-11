---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0030: `@term/X` 跨 term 寻址 + `@upstream` DAG 验证（待办）

> **来源**：`docs_tmp/domain-md-1.md` (2026-06-18)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → v0.7-emergence DSL 演进待办
<!-- /allow-version -->
> **影响层**：L1-OXL / Domain

## 决策（提案）

Domain term 间通过 `@term/X` 显式寻址，并支持 `@upstream` 声明 DAG：

```oxl
domain "Order" {
  term "Order" {
    property id: "uuid"
    property items: "@term/OrderItem[]"   // 跨 term 物理引用
  }
  
  term "OrderItem" {
    property sku: "string"
    property qty: "number"
  }
  
  upstream {
    "OrderItem" -> "@prj/domains/Product"  // 域间依赖
  }
}
```

## `@upstream` DAG 验证

- 编译期检测循环依赖
- 跨域 DAG 显式声明，便于 Impact Analysis
- 与 `@` namespace 哲学一致（物理可寻址）

## 当前状态

- ❌ 未实现
- ⚠️ 当前跨 term 用普通字符串（编译期无法校验）
<!-- allow-version -->
- 🔗 候选落地：v0.7-emergence DSL 演进
<!-- /allow-version -->

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-18-domain-md-1.md`