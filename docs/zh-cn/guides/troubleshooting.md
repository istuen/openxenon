# 5. 故障排查

## 常见问题

### Q1: `oxn init` 失败

**症状**：

```
Error: Permission denied: /home/user/.openxenon
```

**原因**：当前用户对 `.openxenon` 目录没有写权限。

**解决方案**：

```bash
# 检查目录权限
ls -la ~/.openxenon

# 如果存在权限问题，尝试修复
sudo chown -R $(whoami) ~/.openxenon
```

---

### Q2: `oxn task submit` 失败

**症状**：

```
Error: Blueprint not found for task: my-task
请先使用 `oxn task submit --blueprint <file>` 提交 Blueprint。
```

**原因**：任务尚未创建或 Blueprint 文件不存在。

**解决方案**：

1. 确认任务目录存在：

```bash
ls -la .openxenon/tasks/my-task/
```

2. 确认 Blueprint 文件存在：

```bash
cat .openxenon/tasks/my-task/blueprint.yaml
```

3. 如果文件不存在，重新创建任务

---

### Q3: Probe 验证失败

**症状**：

```
[OXN] Probe failed: fs_exists
Path: dist/index.js
Expected: file exists
Actual: file not found
```

**原因**：文件或目录不存在。

**解决方案**：

1. 检查文件路径是否正确
2. 确认构建步骤已成功执行
3. 如果是临时文件，考虑调整 Probe 的检查时机

---

### Q4: Stage 执行顺序不对

**症状**：

```
[OXN] Stage 'Test' executed before 'Build'
```

**原因**：Blueprint 中 `stages.selected` 的顺序不正确。

**解决方案**：

编辑 `.openxenon/tasks/<task-id>/blueprint.yaml`：

```yaml
stages:
  selected:
    - Build    # 确保 Build 在 Test 之前
    - Test
```

---

### Q5: DRAFT 资产无法 promote

**症状**：

```
Error: Asset is not in DRAFT state
```

**原因**：尝试 promote 的资产已经是 CANONICAL 状态。

**解决方案**：

- 使用 `oxn arsenal list` 确认资产当前状态
- 只有 DRAFT 目录下的资产可以 promote

---

### Q6: Daemon 无响应

**症状**：

```
[OXN] Daemon is not responding
```

**解决方案**：

```bash
# 重启 daemon
oxn daemon stop
oxn daemon start

# 检查 daemon 状态
oxn daemon status
```

---

### Q7: `oxn arsenal promote` 无效

**症状**：

```
Asset promoted successfully! (但资产仍在 DRAFT 目录)
```

**原因**：`oxn arsenal promote` 是移动文件，不是复制。

**解决方案**：

1. 确认资产已被移动到 CANONICAL 目录：

```bash
ls -la .openxenon/arsenals/stages/CANONICAL/
```

2. 如果原文件仍然存在，检查是否有权限问题

---

## 最佳实践

### 1. 任务创建后立即提交

```bash
# 提交 Blueprint 创建任务
oxn task submit --blueprint <blueprint-file>
```

### 2. 使用绝对路径

在 Blueprint 中使用绝对路径，避免相对路径歧义：

```yaml
params:
  path: /absolute/path/to/file.txt
```

### 3. Probe 优先于复杂命令

尽量使用原子化 Probe，而不是复杂的多步命令：

```yaml
# 推荐
probes:
  - ref: fs_exists
    params:
      pattern: dist/index.js

# 不推荐
probes:
  - ref: shell_exec
    params:
      command: test -f dist/index.js && echo "exists"
```

### 4. 及时转正 Draft 资产

Draft 资产不会被其他任务引用，完成审查后及时 promote：

```bash
# 审查
oxn arsenal inspect stages/my-stage

# 转正
oxn arsenal promote stages/my-stage
```

### 5. 保持 Blueprint 简洁

Blueprint 应该是"工程图"而不是"执行日志"：

```yaml
# 推荐：简洁的 Blueprint
name: 构建项目
stages:
  - id: build
    name: Build
    target:
      description: "构建项目"
    action:
      description: "运行 npm run build"
    probes:
      - ref: shell_exec
        params:
          command: npm run build

# 不推荐：包含过多细节
name: |
  这是一个复杂的构建任务...
  步骤如下：1. 安装依赖 2. 运行 lint 3. 运行测试...
```

### 6. 定期清理 Draft 资产

如果 Draft 资产长时间未处理，可能已经过时：

```bash
# 查看 Draft 资产
oxn arsenal list DRAFT

# 清理不需要的 Draft
rm .openxenon/arsenals/*/DRAFT/old-asset.yaml
```

---

## 性能优化

### 避免过多的嵌套 Stage

每个 Stage 应该有明确的目的，不要过度拆分。

### 复用已有的 Probe

在创建新 Stage 时，优先复用已有的 Probe：

```yaml
# 复用
probes:
  - ref: fs_exists      # 已存在
  - ref: fs_match        # 新增
```

### 合理设置 timeout

对于耗时较长的命令，设置合理的 timeout：

```yaml
probes:
  - ref: shell_exec
    params:
      command: npm test
      timeout: 30000  # 30 秒
```

---

## 安全建议

### 谨慎使用 force-pass

`force-pass` 会绕过所有验证，仅在极端情况下使用：

```bash
# 警告：极其危险
oxn force-pass <step-id>
```

### 审查所有 Draft 资产

在 promote 之前，务必审查资产内容，防止恶意代码：

```bash
oxn arsenal inspect <asset-path>
```

### 限制 Daemon 权限

确保 Daemon 运行在受控环境中，不要给予过高权限。

---

## 获取帮助

如果遇到本文未涵盖的问题：

1. 查看 Daemon 日志：`~/.openxenon/daemon.log`
2. 使用 `--verbose` 选项获取详细输出
3. 提交 Issue 到项目仓库