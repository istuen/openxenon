## 1. 拆分 XnStage

- [x] 1.1 创建 `src/types/xn-stage.ts` 从 playground.ts 提取 XnStage
- [x] 1.2 将 XnSpec、XnAction 依赖导入到 xn-stage.ts
- [x] 1.3 将 XnStageStatus 依赖导入到 xn-stage.ts

## 2. 拆分 XnBlueprint

- [x] 2.1 创建 `src/types/xn-blueprint.ts` 从 playground.ts 提取 XnBlueprint
- [x] 2.2 将 XnStage 依赖导入到 xn-blueprint.ts

## 3. 精简 playbook.ts

- [x] 3.1 保留 Legacy 的 Step 和 Playbook
- [x] 3.2 移除已拆分的 XnStage、XnBlueprint

## 4. 更新引用

- [x] 4.1 更新 `src/types/index.ts` 导出新文件
- [x] 4.2 查找并更新其他 import 引用