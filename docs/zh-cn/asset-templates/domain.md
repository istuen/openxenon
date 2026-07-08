---
entity: domain
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述本限界上下文的业务边界。
  TODO: 关键业务场景（2-3 行）
references: []
citations: 0
---

# Domain: <name>

> TODO: 一句话描述本限界上下文的业务边界

## Terms

### TODO_Term1
- desc: TODO: domain term definition（核心实体名 + 1 句解释）

<!-- 示例（取消注释即用）：
### Member
- desc: 注册会员实体，含基本信息 + 认证状态

### Account
- desc: 会员的登录凭证，绑 Member.id

### Order
- desc: 订单实体，含商品列表 + 支付状态
-->

## Bans

### forbidden-constructs
- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2
- desc: TODO_BannedTerm1, TODO_BannedTerm2

<!-- 示例（取消注释即用）：
### forbidden-constructs
- items:
  - User
  - Customer
  - AccountHolder
- desc: User, Customer, AccountHolder
-->

## Invariants

### inv-1
- value: TODO: business invariant rule 1

<!-- 示例（取消注释即用）：
### inv-audit
- value: 任何 member 状态变更必须记录到 audit_log

### inv-unique-email
- value: 同一邮箱在同一 context 内不可重复注册

### inv-idempotency
- value: 支付接口必须具备幂等性（idempotency_key）
-->
