---
entity: blueprint
version: 1.0.0
name: order-workflow
---

# Blueprint: order-workflow

> 电商订单处理拓扑：validate（校验购物车）→ charge（结算）→ ship（发货），单链
> 5 类 Intent 资产中的 Blueprint 轴示例（本文件）

## Props

### currency
- type: string
- default: USD
- required: true

### timeout
- type: number
- default: 60000

## Slots

### validate
- deps: []
- observe:
  - schema-valid
  - inventory-available

### charge
- deps:
  - validate
- observe:
  - payment-success

### ship
- deps:
  - charge
- observe:
  - label-printed
  - tracking-created
