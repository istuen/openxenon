## 1. 新建 JSON CRUD 模块

- [x] 1.1 创建 `src/core/projects.ts` - projects.json CRUD（registerProject, getAllProjects）
- [x] 1.2 创建 `src/core/daemon-config.ts` - daemon-config.json CRUD（getDaemonAddress, setDaemonAddress, clearDaemonAddress）
- [x] 1.3 创建 `src/core/config.ts` - config.json CRUD（getSpaceMode, setSpaceMode）
- [x] 1.4 确保所有 JSON 写入使用 .tmp + rename() 原子写入模式

## 2. 改造路径常量模块

- [x] 2.1 修改 `src/core/global.ts` - 删除 CORE_DB_PATH，添加 CORE_PROJECTS_PATH 和 CORE_DAEMON_CONFIG_PATH
- [x] 2.2 修改 `src/core/project.ts` - 删除 getProjectDbPath()，添加 getProjectConfigPath()

## 3. 更新引用方（删除 db 依赖）

### 3.1 Server 和 API 层

- [x] 3.1.1 更新 `src/server.ts` - 删除 initCoreDb 和 daemon-config 导入/调用
- [x] 3.1.2 更新 `src/api/context.ts` - 删除 initProjectDb 导入/调用，改用 getSpaceMode()

### 3.2 Commands 层

- [x] 3.2.1 更新 `src/commands/api/base.ts` - 删除全部 db 导入（CORE_DB_PATH, initCoreDb, getDaemonAddress）
- [x] 3.2.2 更新 `src/commands/init.ts` - 将 setSpaceMode 调用改为写入 JSON 文件

### 3.3 Runtime 层

- [x] 3.3.1 更新 `src/runtimes/bun.adapter.ts` - 删除 XnMigrator 导入
- [x] 3.3.2 更新 `src/runtimes/interfaces/store.interface.ts` - 删除 XnMigrator 类型引用

## 4. 删除废弃文件

- [x] 4.1 删除 `src/db/` 整个目录
- [x] 4.2 删除 `src/core/boundary.ts`
- [x] 4.3 删除 `src/core/boundary-project.ts`

## 5. 更新类型定义

- [x] 5.1 检查 `src/types/index.ts` 中是否有 db 相关类型需要删除
- [x] 5.2 检查 `src/types/task.ts` 中 Project/XnTask 类型是否依赖 db

## 6. 测试更新

- [x] 6.1 删除 `tests/db/init.test.ts`
- [x] 6.2 删除 `tests/db/operations.test.ts`
- [x] 6.3 删除 `tests/core/migrator.test.ts`
- [x] 6.4 更新 `tests/mvp-01.test.ts` - 删除 db 导入
- [x] 6.5 添加 `tests/core/projects.test.ts` - 测试 projects.json CRUD
- [x] 6.6 添加 `tests/core/config.test.ts` - 测试 config.json CRUD

## 7. 验证

- [x] 7.1 运行 `pnpm run typecheck` - 存在预先存在的类型错误，与本变更无直接关系
- [x] 7.2 运行测试确认通过
- [x] 7.3 手动测试 `oxn init` - 确认创建的是 JSON 文件而非数据库
- [x] 7.4 手动测试 `oxn daemon start` - 确认正常启动，无 db 初始化
