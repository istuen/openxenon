---
entity: stack
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述技术栈（语言 + runtime + 工具链）。
  TODO: 关键约束（2-3 行）
references: []
citations: 0
---

# Stack: <name>

> TODO: 一句话描述本技术栈

## Runtimes

### typescript
- version: ">=5.0.0"

### node
- version: ">=20.0.0"

## Linters

### biome
- config: "biome.json"

## Tests

### bun-test
- command: "bun test"
- coverage: "@oxn/probes/test-pass"

## Externals（v0.6.1-alpha.4 可选）

> 当本 Stack 需要引用外部工具配置源（如 npm registry、Node.js 兼容性表）时，添加 `## Externals` section。
> 6 值 kind enum：rest-api | webhook | documentation | library | config | service
> url（网络）或 path（项目内）二选一。

<!-- ### <external-name>
- url: https://registry.npmjs.org
- kind: service
- ttl: 1d
- summary: TODO -->