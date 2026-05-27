## Context

代码中仍有 `Xenonix` 品牌名需要统一为 `OpenXenon`。

## Goals / Non-Goals

**Goals:**
- 项目名: xenonix → openxenon
- 接口名: XenonixSkill → OpenXenonSkill
- 代码中的品牌引用统一

**Non-Goals:**
- 不修改功能逻辑

## Decisions

### 1. 替换策略

| 替换项 | 原值 | 新值 |
|--------|------|------|
| package.json name | xenonix | openxenon |
| 接口 | XenonixSkill | OpenXenonSkill |
| CLI 描述 | Xenonix CLI | OpenXenon |
| 日志输出 | Xenonix | OpenXenon |

### 2. 保留项

- 四大命脉接口: XnStore, XnSandbox, XnRadar, XnTransport (保持 Xn 前缀)
- CLI 命令: oxn (保持不变)
- 目录: .openxenon (保持不变)
- 数据库: *.oxn (保持不变)

## Risks / Trade-offs

- [风险] 遗漏引用 → typecheck 验证

## Migration Plan

1. 替换 package.json name
2. 替换接口名
3. 替换代码中的品牌名
4. typecheck 验证
5. 测试验证