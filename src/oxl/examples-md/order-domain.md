---
entity: domain
version: 0.3.0
name: OrderDomain
---

# Domain: OrderDomain

> 电商订单限界上下文：Cart（购物车）/ Order（订单）/ Charge（结算）三件套 + 不变量约束
> 5 类 Intent 资产中的 Domain 轴示例（本文件）

## Terms

### Cart
- name: Cart
- desc: 用户未结算的购物车集合（含 line items 与价格快照）

### Order
- name: Order
- desc: 提交后生成的不可变订单记录（含 line items + total + status）

### Charge
- name: Charge
- desc: 对 Order 的支付结算动作（pending → success / failed）

### LineItem
- name: LineItem
- desc: 订单/购物车中的一行（sku + quantity + unit_price）

## Bans

### forbidden-constructs
- items: cart-job, order-pipeline, charge-plugin, charge-hook, sync-charge, bulk-charge
- desc: 不允许把 cart/order/charge 写成 Job/Pipeline/Plugin/Hook 模式；统一走 Align 轴的 Work → Task → Part 模型

## Invariants

### inv-1
- value: Cart → Order 转换是不可变的：Order 一旦生成，line items 与 total 不可修改
- desc: Cart → Order 转换是不可变的：Order 一旦生成，line items 与 total 不可修改

### inv-2
- value: Order → Charge 必须 1:1 关系；同一 Order 只能被 charge 一次（防止重复扣款）
- desc: Order → Charge 必须 1:1 关系；同一 Order 只能被 charge 一次（防止重复扣款）

### inv-3
- value: 任何 Order 操作（创建/结算/取消）必须经过 frozen.json 落盘为证据
- desc: 任何 Order 操作（创建/结算/取消）必须经过 frozen.json 落盘为证据
