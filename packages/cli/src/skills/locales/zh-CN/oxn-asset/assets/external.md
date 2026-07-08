---
entity: external
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述本 External 资源的用途。
  TODO: TTL / 刷新策略
references: []
citations: 0
---

# External: <name>

> TODO: 一句话描述本 External 资源的用途

## Links

### payment-api
- url: https://api.stripe.com/v1
- kind: rest-api
- ttl: "7d"
- auth: api-key
- summary: Stripe 支付 API

### log-aggregator
- url: https://logs.example.com/api/v2
- kind: rest-api
- ttl: "24h"
- auth: oauth2
- summary: 中心化日志聚合服务