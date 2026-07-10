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

### Member
- desc: 注册会员实体，含基本信息 + 认证状态

### Account
- desc: 会员的登录凭证，绑 Member.id

### Order
- desc: 订单实体，含商品列表 + 支付状态

## Bans

### forbidden-constructs
- items:
  - User
  - Customer
  - AccountHolder
- desc: User, Customer, AccountHolder（统一用 Member）

## Invariants

### inv-audit
- value: 任何 member 状态变更必须记录到 audit_log

### inv-unique-email
- value: 同一邮箱在同一 context 内不可重复注册

### inv-idempotency
- value: 支付接口必须具备幂等性（idempotency_key）

## Externals（v0.6.1-alpha.4 可选）

> 当本 Domain 需要引用 OXN 系统外的资源时，添加 `## Externals` section。
> 6 值 kind enum：rest-api | webhook | documentation | library | config | service
> url（网络）或 path（项目内）二选一。

<!-- ### <external-name>
- url: https://api.example.com/v1
- kind: rest-api
- ttl: 7d
- auth: api-key
- summary: TODO -->