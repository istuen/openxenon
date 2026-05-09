# restore-arsenals-forges - Tasks

## 1. 重命名 standards → proofs

- [x] 1.1 `mv src/arsenals/standards src/arsenals/proofs`
- [x] 1.2 更新 `src/cli/draft.ts` 导入: `from '../arsenals/standards'` → `from '../arsenals/proofs'`

## 2. 创建 forges 目录结构

- [x] 2.1 `mkdir -p src/arsenals/forges/meta-probe`
- [x] 2.2 `mkdir -p src/arsenals/forges/meta-proof`
- [x] 2.3 `mkdir -p src/arsenals/forges/meta-stage`
- [x] 2.4 `mkdir -p src/arsenals/forges/meta-blueprint`

## 3. 创建 Forge 模板文件

- [x] 3.1 创建 `src/arsenals/forges/meta-probe/canonical.yaml`
- [x] 3.2 创建 `src/arsenals/forges/meta-proof/canonical.yaml`
- [x] 3.3 创建 `src/arsenals/forges/meta-stage/canonical.yaml`
- [x] 3.4 创建 `src/arsenals/forges/meta-blueprint/canonical.yaml`

## 4. 删除空目录

- [x] 4.1 `rmdir src/arsenals/arsenal/`

## 5. 更新 cli/init.ts

- [x] 5.1 更新 `META_SOURCE_PATH` 从 `join(__dirname, '..', 'meta')` 到 `join(__dirname, '..', 'arsenals', 'forges')`

## 6. 更新 cli/forge.ts

- [x] 6.1 更新 `forgePath` 从 `join(projectBoundary, 'meta', name, 'canonical.yaml')` 到 `join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')`

## 7. 更新 skills/oxn-forge.ts

- [x] 7.1 更新 `forgePath` 从 `join(projectBoundary, 'meta', name, 'canonical.yaml')` 到 `join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')`

## 8. 更新 kernel/constants.ts

- [x] 8.1 删除 `export const FORGES_DIR = 'forges'`
- [x] 8.2 删除 `export const META_DIR = 'meta'`

## 9. 验证

- [x] 9.1 `pnpm run typecheck` 通过
- [x] 9.2 `pnpm build` 通过
- [x] 9.3 确认 `oxn forge probe` 能正确显示 Forge 约束

## 10. 提交

- [x] 10.1 `git add -A && git commit -m "restore: arsenals structure with forges"`
