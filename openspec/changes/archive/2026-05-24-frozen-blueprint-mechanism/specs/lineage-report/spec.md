## ADDED Requirements

### Requirement: submit 时输出血缘报告
当执行 `oxn task submit` 时，Core SHALL 打印血缘报告到终端供人类审查。

### Requirement: 血缘报告显示每个 Stage 的解析结果
血缘报告 SHALL 包含每个 Stage 的以下信息：
- Stage ID
- 解析状态（成功/失败）
- 解析来源（kernel/global/project）
- Shadowing 警告（如适用）

### Requirement: 血缘报告格式
血缘报告 SHALL 使用以下格式：
```text
[Core] Resolving blueprint assets...
  ✅ stage: <stage-id>
     -> resolved: <path> (<source>)
     -> version frozen.
  ⚠️ stage: <stage-id>
     -> resolved: <path> (Shadowed Global)
     -> version frozen.
```

### Requirement: Shadowing 时使用警告符号
当某个 Stage 发生了 Shadowing 时，血缘报告 SHALL 在该行输出 `⚠️` 警告符号。

#### Scenario: 正常解析
- **WHEN** Stage 引用解析到内置资产
- **THEN** 血缘报告输出 `✅` 和 "(Kernel)"

#### Scenario: Shadowing 警告
- **WHEN** Stage 引用解析到项目级遮蔽的全局资产
- **THEN** 血缘报告输出 `⚠️` 和 "(Shadowed Global)"