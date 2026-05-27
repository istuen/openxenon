## 1. Arsenal Loader 更新

- [x] 1.1 修改 `loadStandardByPath()` 支持检测 `draft.yaml` 和 `canonical.yaml` 文件名
- [x] 1.2 修改 `loadArsenalsByState()` 按文件名匹配 `*draft.yaml` 和 `*canonical.yaml`
- [x] 1.3 更新 `getTypeFromPath()` 移除对 `draft/` 目录的解析

## 2. Arsenal Promote 命令更新

- [x] 2.1 修改 `promoteStandard()` 从 `mv draft/canonical.yaml` 改为 `mv draft.yaml canonical.yaml`
- [x] 2.2 添加检测 `draft.yaml` 不存在时抛出错误的逻辑
- [x] 2.3 更新 CLI `oxn arsenal promote` 校验源文件存在性

## 3. Oxn Forge 更新

- [x] 3.1 修改 `oxn-forge` 生成 `draft.yaml` 而非 `draft/blueprint.yaml`
- [x] 3.2 确保生成目录只包含 `draft.yaml`（无 draft/ 子目录）
- [x] 3.3 可选：生成初始 `README.md` 到资产目录

## 4. 迁移工具

- [x] 4.1 创建 `oxn migrate:arsenal` 命令
- [x] 4.2 扫描所有 `draft/*/blueprint.yaml` 格式资产
- [x] 4.3 执行 `mv` 命令转换为新格式（`blueprint.yaml` → `draft.yaml`）

## 5. 测试与验证

- [ ] 5.1 更新 `tests/core/arsenals-loader.test.ts` 测试新文件名检测逻辑
- [ ] 5.2 添加 `draft.yaml` → `canonical.yaml` 晋升流程测试
- [x] 5.3 运行 `pnpm run typecheck` 确认无类型错误
- [x] 5.4 运行测试确认通过（4个预先存在的失败测试）
