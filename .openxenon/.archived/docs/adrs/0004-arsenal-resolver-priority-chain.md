---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0004: ArsenalResolver 优先级链（Project > Global > Builtin）

> **来源**：`docs_tmp/system-2.md` (2026-05-26)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L2-Builtin

## 决策

资产解析优先级（高到低）：

```
Project (`@prj/...`)  >  Global (`@gbl/...`)  >  Builtin (`@oxn/...`)
```

## 背景

Work 看到的是 `ArsenalResolver`，而非 `BuiltinArsenal` 直接引用。DSL 通过 Port 注入获得 Resolver，Arsenal 类（Forge/Promote）封装解析逻辑。

## 后果

- ✅ 项目级资产可覆盖 builtin
- ✅ 工程师可渐进式替换 builtin 实现
- ✅ BUILTIN_* 常量驻留 L2（不污染 L0/L1）
- 🔗 当前 `src/builtin/` 路径已落实此原则

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-26-system-2.md`