## 1. WorkBlueprintTypeValidator 实现

- [x] 1.1 创建 `work-type-validator.ts`，实现 `WorkBlueprintTypeValidator` 类
- [x] 1.2 实现 `validateWorkBlueprintType` 方法，检查 Work.type === Blueprint.type
- [x] 1.3 返回 `ValidationAcceptor` 错误列表

## 2. SlotReferenceValidator 实现

- [x] 2.1 创建 `slot-reference-validator.ts`，实现 `SlotReferenceValidator` 类
- [x] 2.2 实现 `validateSlotReference` 方法，检查 slot 名称存在
- [x] 2.3 返回 `ValidationAcceptor` 错误列表

## 3. 集成到 Langium 流水线

- [x] 3.1 在 `oxn-services.ts` 注册 validator（通过 registerOxnValidators）
- [x] 3.2 验证 validator 在解析阶段生效