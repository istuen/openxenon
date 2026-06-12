## ADDED Requirements

### Requirement: Probe type enumeration includes all supported types

`src/kernel/schemas/probe.ts` 中定义的 `ProbeTypeSchema` SHALL 包含：
- `fs_exists`：检查文件存在
- `fs_not_exists`：检查文件不存在
- `fs_content_match`：检查文件内容匹配正则
- `exec_exit_zero`：检查命令执行成功（exit code === 0）

#### Scenario: Valid probe types are accepted

- **WHEN** Kernel 验证探针调用时使用 `fs_exists`
- **THEN** Schema 校验通过

#### Scenario: Invalid probe type is rejected

- **WHEN** Kernel 验证探针调用时使用 `fs_match`（旧名）
- **THEN** Schema 校验失败，抛出验证错误

### Requirement: FsContentMatchParams uses path and contains

`FsContentMatchParamsSchema` SHALL 使用 `path` 和 `contains` 作为参数名：

```typescript
FsContentMatchParamsSchema = z.object({
  path: z.string(),      // 要检查的文件路径
  contains: z.string()   // 文件内容必须匹配的正则
})
```

#### Scenario: Valid FsContentMatch params are accepted

- **WHEN** 探针调用为 `{ type: "fs_content_match", params: { path: "*.ts", contains: "export" } }`
- **THEN** Schema 校验通过

#### Scenario: Old parameter names are rejected

- **WHEN** 探针调用为 `{ type: "fs_content_match", params: { pattern: "*.ts", contains: "export" } }`
- **THEN** Schema 校验失败

### Requirement: Skill references use correct type names and parameter names

`oxn-forge` 和 `oxn-task` 的 references SHALL 使用正确的类型名和参数名：
- `fs_content_match`（不是 `fs_match`）
- `exec_exit_zero`（不是 `shell_exec`）
- `fs_content_match` 参数：`path` + `contains`

#### Scenario: Skill reference generates valid YAML

- **WHEN** AI 读取 probe-format.md 后生成探针定义
- **THEN** 生成的 YAML 被 Schema 接受

### Requirement: Blueprint probeRefs use correct type names

Blueprint 中的 `probeRefs` SHALL 使用正确的探针类型名：

```yaml
probeRefs:
  - type: fs_content_match    # 不是 fs_match
    params:
      path: "src/**/*.ts"
      contains: "export"
  - type: exec_exit_zero      # 不是 shell_exec
    params:
      command: npm test
```

#### Scenario: Blueprint with correct types passes Schema validation

- **WHEN** Blueprint 包含 `type: fs_content_match` 和 `params: { path, contains }`
- **THEN** Schema 校验通过