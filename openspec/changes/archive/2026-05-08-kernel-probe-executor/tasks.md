## 1. 创建 infra/ 目录（物理边界）

- [x] 1.1 创建 `src/infra/fs.ts`（文件系统原子操作封装）
- [x] 1.2 创建 `src/infra/process.ts`（子进程执行封装）
- [x] 1.3 创建 `src/infra/socket.ts`（Unix Socket 通信封装）
- [x] 1.4 创建 `src/infra/index.ts`（导出入口）

## 2. 创建 kernel/probes/ 目录（通用解释器）

- [x] 2.1 创建 `src/kernel/probes/executor.ts`（通用探针解释器）
- [x] 2.2 创建 `src/kernel/probes/types.ts`（探针类型定义）
- [x] 2.3 创建 `src/kernel/probes/index.ts`（导出入口）

## 3. 创建 arsenals/probes/ 目录（探针 YAML 定义）

- [x] 3.1 创建 `src/arsenals/probes/fs-exists/canonical.yaml`
- [x] 3.2 创建 `src/arsenals/probes/fs-not-exists/canonical.yaml`
- [x] 3.3 创建 `src/arsenals/probes/fs-match/canonical.yaml`
- [x] 3.4 创建 `src/arsenals/probes/shell-exec/canonical.yaml`

## 4. 目录重命名

- [x] 4.1 `src/common/` → `src/kernel/`
- [x] 4.2 `src/meta/` → `src/arsenals/`
- [x] 4.3 `src/lib/` → `src/infra/`
- [x] 4.4 `src/commands/` → `src/cli/`

## 5. 清理旧代码

- [x] 5.1 删除 `src/daemon/probes/` 目录（旧探针实现）
- [x] 5.2 删除旧目录（旧 `common/`、`meta/`、`lib/`、`commands/`）
- [x] 5.3 更新所有导入引用

## 6. 更新 kernel/ 其他模块

- [ ] 6.1 更新 `kernel/types.ts`（整合 types/）
- [ ] 6.2 更新 `kernel/schemas/`（整合 common/schemas/）
- [ ] 6.3 更新 `kernel/engine/executor.ts`（使用新的 probe executor）

## 7. 验证

- [ ] 7.1 运行 typecheck 确认无类型错误
- [ ] 7.2 手动测试 `oxn init` 正常工作
- [ ] 7.3 手动测试 `oxn forge probe` 显示正确约束