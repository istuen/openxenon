---
entity: task
version: 0.3.0
name: t1-validate
work: place-order
---

# Task: t1-validate

> 示例 Task：演示 unified + 纯 MD 语法的 Task 实体
> 5 类 Intent 资产中的 Task 轴示例（本文件）
> 职责：校验购物车的 LineItem 合法性与库存可用性

## Parts

### validate
- skill_context: 校验 cart 的所有 line items：sku 存在 + 库存可用 + 价格未过期；输出 valid cart 或 fail reason

## Probes

### schema-valid
- scheme: schema
- expect: every LineItem has all of sku quantity unit_price with quantity > 0 and unit_price >= 0

### inventory-available
- scheme: inventory
- expect: for each LineItem, requested quantity <= available stock
