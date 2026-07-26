---
title: DSL 扩展
---

# DSL 扩展

> OXL grammar 修改流程 + .md 原生扩展方式。

## OXL 现状

- v0.7.0 后 `.oxn`（Langium）格式**已废弃**，`.md` 是唯一 canonical 格式
- `EntityRegistry` 单例 + Factory 范式
- 5 个 compiler + extract-headings/extract-list-fields

## .md 扩展方式

```
packages/engine/src/oxl/md-bridge/compilers/
├── domain-compiler.ts
├── blueprint-compiler.ts
├── stack-compiler.ts
├── roadmap-compiler.ts
└── work-compiler.ts
```

## Langium Grammar（历史参考）

```langium
// packages/engine/src/oxl/langium/oxn.langium（已删除，仅存历史）
Domain: 'domain' name=ID '{' (term+=Term)* ('upstream' '{' upstream+=UpstreamEdge* '}')? '}';
Term: 'term' name=ID '{' (property+=Property | invariant+=Invariant)* ('anchor' '=' anchor=STRING)? '}';
Property: name=ID ':' type=PropertyType;
PropertyType: STRING | TermRef;  // v0.8.0: STRING | '@term/'ID
```

## 参考

- [RFC-0001 OXL/Blueprint 哲学 §D3 MD-native 语法统一](../../../rfc/zh-cn/RFC-0001-oxl-philosophy.html#d3-md-native-语法统一)
- v0.7 Emergence RFC（探索阶段产物，待 v0.8+ 落地）
