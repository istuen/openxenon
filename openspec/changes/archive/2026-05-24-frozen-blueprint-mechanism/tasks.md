## 1. 冻结机制

- [x] 1.1 在 `oxn task submit` 时触发冻结
- [x] 1.2 实现 ref 深度内联展开
- [x] 1.3 深拷贝到 `.openxenon/tasks/<task_id>/blueprint.frozen.yaml`
- [x] 1.4 验证 Kernel 无 I/O import

## 2. frozen.yaml Schema

- [x] 2.1 定义必填字段（id、name、frozen_at、stages）
- [x] 2.2 定义 _xenon_meta 嵌入结构
- [x] 2.3 确保参数已注入，无 {{...}} 占位符
- [x] 2.4 frozen 文件只读保护

## 3. _xenon_meta 注入

- [x] 3.1 为每个 Stage 注入 _xenon_meta
- [x] 3.2 为每个 Probe 注入 _xenon_meta
- [x] 3.3 计算 content_hash (SHA256)
- [x] 3.4 标记 appended 状态

## 4. 血缘报告

- [x] 4.1 submit 时打印血缘报告到终端
- [x] 4.2 报告格式：✅/⚠️ + stage id + resolved path + source
- [x] 4.3 Shadowing 时输出警告符号
- [x] 4.4 人类可审查后确认执行