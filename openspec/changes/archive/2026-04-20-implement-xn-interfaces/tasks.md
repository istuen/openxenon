## 1. 接口定义实现（新增）

- [x] 1.1 创建 `src/runtimes/interfaces/store.interface.ts`
- [x] 1.2 创建 `src/runtimes/interfaces/sandbox.interface.ts`
- [x] 1.3 创建 `src/runtimes/interfaces/radar.interface.ts`
- [x] 1.4 创建 `src/runtimes/interfaces/transport.interface.ts`
- [x] 1.5 创建 `src/runtimes/interfaces/index.ts`

## 2. 核心类型定义（更新现有）

- [x] 2.1 更新 `src/types/core.ts` 添加 XnStageStatus 和 XnTaskStatus
- [x] 2.2 更新 `src/types/task.ts` 添加 xnBlueprint/xnAction 字段 → XnTask
- [x] 2.3 更新 `src/types/playbook.ts` 添加 xnSpec/xnAction/xnSample → XnBlueprint/XnStage
- [x] 2.4 更新 `src/types/proof.ts` 扩展 Proof → XnProof
- [x] 2.5 创建 `src/types/xn-spec.ts` 定义 XnSpec
- [x] 2.6 创建 `src/types/xn-action.ts` 定义 XnAction
- [x] 2.7 创建 `src/types/xn-sample.ts` 定义 XnSample

## 3. 类型导出

- [x] 3.1 更新 `src/types/index.ts` 导出 Xn* 类型
- [x] 3.2 创建 `src/runtimes/index.ts` 统一导出所有接口