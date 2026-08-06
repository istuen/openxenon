# Blueprint: [功能名称]

## Metadata
- **ID**: `bp-[feature-name]-v1`
- **关联 Domain**: `domain-order-system`
- **作者**: [工程师姓名]
- **创建时间**: YYYY-MM-DD

## 1. 上下文与目标 (Context & Goal)
- **背景**: [描述为什么需要这个功能，解决什么问题]
- **目标**: [清晰、可验证的目标，例如：“实现用户下单功能，确保库存不足时返回明确错误”]
- **输入**: [功能需要的输入数据或前置条件]
- **输出**: [功能完成后产出的结果或状态变更]

## 2. 蓝图插槽 (Blueprint Slots)  ← 这是模板的核心可变区域
- **Slot A**: `[slot-name-1]` - `[slot-description]`
    - **类型**: `[function | component | route | data-model | ...]`
    - **位置**: `[file-path-or-module]`
    - **接口/契约**: `[input/output types, function signature]`
    - **约束**: `[specific rules, e.g., "此函数必须是纯函数"]`
- **Slot B**: `[slot-name-2]` - `[slot-description]`
    - ...

## 3. 术语表 (Terms)
- `[Term-1]`: [精确定义]
- `[Term-2]`: [精确定义]
  *(这部分可以直接引用 Domain 中的 Terms，也可以补充本蓝图特有的)*

## 4. 不变条件 (Invariants)
- [必须始终成立的条件，例如：“订单总额必须等于所有商品价格之和”]
- [禁止违反的规则，例如：“不允许直接操作数据库，必须通过 Repository 层”]

## 5. 验证标准 (Verification Criteria)
- [如何验证目标达成，例如：“单元测试覆盖所有 Slot”、“E2E 测试通过下单场景”]
