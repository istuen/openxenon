## 1. 路径常量重构

- [x] 1.1 修改 `infra/paths.ts`：移除 `GLOBAL_FORGES_ROOT`，新增 `GLOBAL_ARSENAL_ROOT`
- [x] 1.2 修改 `arsenals/paths.ts`：移除 `GLOBAL_FORGES_*` 常量，统一到 `GLOBAL_ARSENAL_*`
- [x] 1.3 更新 `resolveArsenalRoot` 和 `resolveForgeRoot` 函数统一到 `resolveArsenalRoot`
- [x] 1.4 验证没有其他文件直接引用 `GLOBAL_FORGES_ROOT`

## 2. Arsenal 目录结构重组

- [x] 2.1 修改 `arsenals/init.ts`：`ensureArsenalDirectories` 创建 `drafts/` 子目录
- [x] 2.2 移除 `ensureForgesDirectories`，统一到 `ensureArsenalDirectories`
- [x] 2.3 修改 `arsenals/paths.ts` 中的 `ARSENAL_DIRECTORY_STRUCTURE`：使用 `drafts/` (复数)

## 3. Forge 写入路径调整

- [x] 3.1 修改 `arsenals/forge.ts`：`getArsenalDraftPath` 函数写入到 `arsenal/<type>/drafts/<name>.<ext>`
- [x] 3.2 Blueprint forge 路径：`arsenal/blueprints/drafts/<name>/draft.oxn`
- [x] 3.3 Part/Probe forge 路径：`arsenal/<type>/drafts/<name>.oxn`

## 4. Promote 路径迁移逻辑

- [x] 4.1 修改 `arsenals/promoter.ts`：替换逻辑从 `/forges/` → `/arsenals/` 改为 `/drafts/` → `/` (同级)
- [x] 4.2 修改 `arsenals/promoter.ts`：移除 `isForgeFormat` 判断，保留 `isArsenalDraftFormat`
- [x] 4.3 更新 `promoteToCanonical` 返回的路径格式

## 5. Loader 合并与 state 过滤

- [x] 5.1 修改 `infra/loader.ts`：`loadStandardByName` 添加 `options.state` 参数
- [x] 5.2 实现 `state='canonical'`：只查询正式目录，不查询 drafts/
- [x] 5.3 实现 `state='draft'`：只查询 drafts/ 目录
- [x] 5.4 实现 `state='both'`：同时查询两个目录
- [x] 5.5 合并 `scanForgesDirectory` 到 `scanArsenalStructure`
- [x] 5.6 移除 `scanForgesDirectory` 函数

## 6. CLI 更新

- [x] 6.1 修改 `cli/arsenal-promote.ts`：移除 `/forges/` 字符串判断
- [x] 6.2 修改 `cli/global-arsenal-promote.ts`：移除 `/forges/` 字符串判断
- [x] 6.3 修改 `cli/global-arsenal-render.ts`：更新 draft.yaml 路径
- [x] 6.4 修改 `cli/global-arsenal-migrate.ts`：更新迁移路径
- [x] 6.5 修改 `cli/arsenal-migrate.ts`：更新迁移路径

## 7. 迁移脚本

- [x] 7.1 更新 `cli/arsenal-migrate.ts`：支持旧结构到新结构的迁移
- [x] 7.2 迁移 `forges/<type>/<name>.oxn` → `arsenal/<type>/drafts/<name>.oxn`
- [x] 7.3 迁移 `forges/blueprints/<name>/draft.oxn` → `arsenal/blueprints/drafts/<name>/draft.oxn`
- [x] 7.4 清理迁移后的空目录

## 8. 验证与清理

- [x] 8.1 验证 `oxn forge probe <name>` 写入新路径
- [x] 8.2 验证 `oxn promote probe <name>` 移动到正式路径
- [x] 8.3 验证 `loadStandardByName` 默认不返回 draft 资产
- [x] 8.4 验证 Task submit 使用 canonical Blueprint
- [x] 8.5 全局搜索确认无 `/forges/` 字符串残留
- [x] 8.6 运行测试套件验证无回归