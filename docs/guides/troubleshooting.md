# 故障排查

本文档提供 OpenXenon 常见问题的排查指南。

## 初始化问题

### oxn init 失败

**症状**：

```
Error: Permission denied: .openxenon
```

**原因**：当前用户对目录没有写权限。

**解决方案**：

```bash
# 检查目录权限
ls -la .

# 如果存在权限问题，尝试修复
sudo chown -R $(whoami) .
```

---

## 资产管理问题

### DRAFT 资产无法 promote

**症状**：

```
Error: Asset is not in DRAFT state
```

**原因**：尝试 promote 的资产已经是 CANONICAL 状态。

**解决方案**：

```bash
# 确认资产当前状态
oxn arsenal list DRAFT

# 只有 DRAFT 目录下的资产可以 promote
```

### 资产列表为空

**症状**：

```
oxn arsenal list
# 无输出
```

**原因**：尚未创建任何资产。

**解决方案**：

```bash
# 查看内置资产
oxn arsenal list

# 创建新资产
oxn forge probe --save '<yaml>' --name my-check
```

---

## 任务执行问题

### oxn task submit 失败

**症状**：

```
Error: Blueprint not found: my-task.yaml
```

**原因**：Blueprint 文件不存在或路径错误。

**解决方案**：

```bash
# 确认文件存在
ls -la my-task.yaml

# 使用绝对路径
oxn task submit --blueprint /absolute/path/to/my-task.yaml
```

### Blueprint 编译失败

**症状**：

```
Error: Invalid Blueprint: missing required field 'stages'
```

**原因**：Blueprint YAML 格式错误。

**解决方案**：

检查 Blueprint 结构：

```yaml
# 正确结构
name: 我的任务
stages:
  - id: stage-1
    name: 第一阶段
    target:
      description: "执行作用域"
    action:
      description: "执行指令"
    spec:
      description: "验收标准"
    probes:
      - ref: fs_exists
        parameters:
          pattern: "dist/"
```

### Stage 验证失败

**症状**：

```
Stage: build
Status: FAILED
Probes:
  ✗ fs_exists: dist/index.js
     Expected: file exists
     Actual: file not found
```

**原因**：AI 助手未正确构建 Artifact，或 Probe 参数错误。

**解决方案**：

1. 检查 Artifact 是否存在：

```bash
ls -la dist/index.js
```

2. 检查 Probe 参数是否正确：

```yaml
probes:
  - ref: fs_exists
    parameters:
      pattern: "dist/index.js"  # 确认路径正确
```

3. 重新执行 Stage

---

## Probe 执行问题

### shell_exec Probe 超时

**症状**：

```
Error: Command timeout after 30000ms
```

**原因**：命令执行时间过长。

**解决方案**：

在 Probe 中设置更长的超时时间：

```yaml
probes:
  - ref: shell_exec
    parameters:
      command: "npm run build"
      timeout: 60000  # 60 秒
```

### fs_match Pattern 不匹配

**症状**：

```
✗ fs_match: config.json
   Pattern: "production"
   Actual: "development"
```

**原因**：文件内容不匹配预期。

**解决方案**：

1. 检查文件内容：

```bash
cat config.json
```

2. 调整 Probe 参数：

```yaml
probes:
  - ref: fs_match
    parameters:
      pattern: "config.json"
      contains: "development"  # 调整为实际内容
```

---

## 调试技巧

### 启用详细输出

使用 `-v` 选项查看详细日志：

```bash
oxn task verify --task-id <id> --stage-id <id> -v
```

### 查看 Frozen 快照

检查编译后的执行计划：

```bash
cat .openxenon/tasks/<task-id>/frozen.yaml
```

### 查看 Trace 记录

检查执行轨迹：

```bash
cat .openxenon/tasks/<task-id>/task-trace.yaml
```

### JSON 输出

使用 `-j` 选项获取 JSON 格式输出，便于解析：

```bash
oxn task status --task-id <id> -j
```

---

## 获取帮助

如果遇到本文未涵盖的问题：

1. 使用 `--verbose` 选项获取详细输出
2. 查看 `.openxenon/tasks/<task-id>/task-trace.yaml`
3. 提交 Issue 到项目仓库
