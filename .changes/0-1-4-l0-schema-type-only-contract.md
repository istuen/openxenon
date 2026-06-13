---
categories:
  - Changed
---

- **Note** L0-L3 宪法 §4.1 八子层依赖表 L0-Schema 行精确化为「L0-Contract *(type-only，编译后消除)*」；§7.4 增列 C-12 偏差条目「L0-Schema → L0-Contract (type-only) 合法」并指明首个既有合法用例 `src/kernel/schemas/validators/compiled-schema.ts:2`（`import type { HashPort }`）。原因：`import type` 在 TS 编译后整行消失，零运行时耦合；`validate-dependencies.ts` 的 `isTypeOnlyImport` 检测（§7.2.1 C-2 修复）已正确豁免。DDD 视角：类型签名是数据契约的一部分，Schema 知道"元数据包含什么"是合理的。
