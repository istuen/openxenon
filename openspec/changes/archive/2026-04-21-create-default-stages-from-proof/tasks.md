## 1. 创建 fs* 默认 Stage 配置

- [x] 1.1 在 `src/core/stage/` 目录下创建 `default-stages.ts` 文件
- [x] 1.2 定义 `DefaultStage` 接口，包含 id、name、proof、description、exampleInput 字段
- [x] 1.3 创建 4 个 fs* 默认 Stage 配置：
  - `default:fs_exists` - 检查文件或目录是否存在
  - `default:fs_not_exists` - 检查文件或目录是否不存在
  - `default:fs_content_match` - 检查文件内容是否包含指定文本
  - `default:fs_parseable` - 检查文件是否可解析为指定格式

## 2. 实现默认 Stage 查询功能

- [x] 2.1 导出 `getAllDefaultStages()` 函数，返回所有默认 Stage
- [x] 2.2 导出 `getDefaultStageById(id: string)` 函数，根据 ID 获取单个默认 Stage
- [x] 2.3 实现 Stage ID 解析逻辑，支持 `default:<proof-id>` 格式

## 3. 集成到 Stage 执行器

- [x] 3.1 修改 `StageExecutor` 支持加载默认 Stage 模板
- [x] 3.2 在 Blueprint 解析时处理 `stage: "default:fs_exists"` 等引用
- [x] 3.3 实现用户 input 与默认 Stage 配置的合并逻辑

## 4. 测试

- [x] 4.1 编写单元测试验证 4 个 fs* 默认 Stage 配置
- [x] 4.2 验证默认 Stage 加载和引用功能