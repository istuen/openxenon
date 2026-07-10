---
entity: workflow
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述本执行流程的步骤与依赖。
  TODO: 适用场景（2-3 行）
references: []
citations: 0
---

# Workflow: <name>

> TODO: 一句话描述本执行流程

## Props

### env
- type: enum
- values:
  - dev
  - staging
  - prod
- required: true
- default: dev

### timeout
- type: number
- default: 60000

## Slots

### analyze
- deps: []
- observe:
  - fs-exists
  - lint-check

### implement
- deps:
  - analyze
- observe:
  - ts-compiles
  - test-pass

### verify
- deps:
  - implement
- observe:
  - test-pass

## Externals（v0.6.1-alpha.4 可选）

> 当本 Workflow 需要引用外部工具链文档或 CI 配置时，添加 `## Externals` section。
> 6 值 kind enum：rest-api | webhook | documentation | library | config | service
> url（网络）或 path（项目内）二选一。

<!-- ### <external-name>
- path: ./docs/development/ci-guide.md
- kind: documentation
- summary: TODO -->