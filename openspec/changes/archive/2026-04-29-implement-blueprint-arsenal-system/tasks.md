## 1. 扩展 Arsenal 类型支持

- [x] 1.1 修改 `src/core/arsenals-paths.ts`，添加 `AssetType = 'blueprints'` 支持
- [x] 1.2 添加 `ARSENALS_BLUEPRINTS` 等路径常量
- [x] 1.3 更新 `getTypeFromPath` 函数识别 blueprints 路径

## 2. 扩展 Arsenal 加载器

- [x] 2.1 修改 `src/core/arsenals-loader.ts`，扩展 `loadArsenalsByState` 支持 blueprints
- [x] 2.2 添加 `loadBlueprintByName` 函数 (在 blueprint.ts)
- [x] 2.3 添加 Blueprint 文件解析逻辑（JSON 格式）
- [x] 2.4 更新 `scanArsenalsDirectory` 支持 blueprints

## 3. 实现 Blueprint CRUD 操作

- [x] 3.1 实现 `loadBlueprint(path)` 函数解析 Blueprint JSON
- [x] 3.2 实现 `saveBlueprint(path, blueprint)` 函数保存 Blueprint
- [x] 3.3 实现 `promoteBlueprint(fromPath)` 函数将 draft 转为 canonical

## 4. 实现 Task 创建时复制 Blueprint

- [x] 4.1 在 Task 创建逻辑中添加 Blueprint 复制
- [x] 4.2 从 Arsenal 模板复制到 `tasks/<task_id>/blueprints/`
- [x] 4.3 设置 `source` 字段记录原始 Blueprint ID
- [x] 4.4 设置副本状态为 `DRAFT`

## 5. 实现 Stage 引用解析

- [x] 5.1 实现 `resolveStageReference(reference)` 函数
- [x] 5.2 `defaults/<name>` 解析为 `arsenals/stages/<name>/canonical.md`
- [x] 5.3 `custom/<name>` 解析为 `arsenals/stages/<name>/canonical.md`

## 6. 实现 Blueprint 反哺 Arsenal

- [x] 6.1 在 Task 完成后提示工程师是否反哺 (CLI 层面)
- [x] 6.2 实现 `promoteToArsenal(taskBlueprintPath, blueprintName)` 函数
- [x] 6.3 复制到 `arsenals/blueprints/<name>/draft.json`
- [x] 6.4 旧版 canonical 移入 archive/

## 7. 验证与测试

- [ ] 7.1 测试 `oxn arsenal list --type blueprints` 输出正确
- [ ] 7.2 测试 Task 创建时 Blueprint 被正确复制
- [ ] 7.3 测试 Blueprint 副本可修改且不影响原版
- [ ] 7.4 测试反哺功能生成正确的 archive 结构