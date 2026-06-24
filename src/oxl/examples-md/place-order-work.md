---
entity: work
version: 0.3.0
name: place-order
---

# Work: place-order

> 示例 Work：演示 unified + 纯 MD 语法的 Work 实体
> 5 类 Intent 资产中的 Work 轴示例（本文件）
> 业务流：用户提交购物车 → 校验 → 结算 → 发货

## Context

### primary
- goal: 演示 place-order Work：5 类 Intent 资产中的 Work 轴纯 MD 语法样例
- constraints:
  - 必须用 oxn work 命令而非直接读源码
  - 报告输出到 .openxenon/works/place-order/report.md
- max_iterations: 3

## Tasks

### t1-validate
- blueprint: order-workflow
- domain: OrderDomain
- part: validate
  - skill_context: 校验购物车：检查所有 LineItem 的 sku 存在 + 库存可用 + 价格未过期

### t2-charge
- blueprint: order-workflow
- domain: OrderDomain
- part: charge
  - skill_context: 对 Order 执行结算：调用支付网关 + 写 Charge 记录
- deps:
  - t1-validate

### t3-ship
- blueprint: order-workflow
- domain: OrderDomain
- part: ship
  - skill_context: 发货：生成物流标签 + 推送到承运商 API + 回写 tracking_id
- deps:
  - t2-charge
