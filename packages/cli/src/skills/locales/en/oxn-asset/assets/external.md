---
entity: external
version: 0.1.0
name: <name>
abstract: |
  TODO: One-line description of this External resource's purpose.
  TODO: TTL / refresh strategy
references: []
citations: 0
---

# External: <name>

> TODO: One-line description of this External resource's purpose

## Links

### payment-api
- url: https://api.stripe.com/v1
- kind: rest-api
- ttl: "7d"
- auth: api-key
- summary: Stripe payment API

### log-aggregator
- url: https://logs.example.com/api/v2
- kind: rest-api
- ttl: "24h"
- auth: oauth2
- summary: Centralized log aggregation service