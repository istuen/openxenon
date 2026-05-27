## Context

WorkDeclaration 已支持 `type` 和 `ref` 属性，但缺少对 Blueprint type 的 1:1 校验。同样，slot 引用也未在编译期校验存在性。

Langium 提供了 `LangiumValidator` 接口，可在文档解析阶段执行自定义校验。

## Goals / Non-Goals

**Goals:**
- 实现 `WorkBlueprintTypeValidator`：校验 Work.type === Blueprint.type
- 实现 `SlotReferenceValidator`：校验 slot 名称在 Blueprint 的 partSlots 中存在
- 集成到 Langium 流水线，解析阶段报错

**Non-Goals:**
- 不修改现有 validator 行为
- 不实现运行时校验（由 Kernel 执行）

## Decisions

### 1. Validator 实现位置

**选择**：`src/oxn-dsl/validator/` 目录

**理由**：与现有 `mutation-validator.ts`、`rule-validator.ts` 保持一致。

### 2. 集成方式

**选择**：Langium 的 `DefaultLangiumValidator` + `@discourse` 装饰器

**理由**：
- Langium 原生支持自定义 validator
- 通过 `accepts` 方法过滤校验目标

### 3. 错误报告格式

**选择**：返回 `ValidationAcceptor` 错误列表

**理由**：Langium 标准接口，IDE 可直接显示。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Blueprint 未加载时无法校验 type | 延迟校验到 `accepts` 返回 `WorkDeclaration` 后再解析 ref |
| slot 校验需要 Blueprint 的 partSlots | 从 IR 中获取，不直接解析 Blueprint 文件 |