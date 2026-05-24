# Blueprint 格式参考（oxn-work 用）

## OXN Mode (v3.1 Slot 范式)

Blueprint 内有两种 Part 声明：

| 类别 | 语法 | 含义 | 谁填充 |
|------|------|------|--------|
| **A 具象** | `part "name" ref "@..." { prop ... }` | 直接绑定 Arsenal 资产 | Blueprint 自己 |
| **B 插槽** | `part slot[] "name" { deps = [...] }` | 占位角色，待 Work 填充 | Work |

```oxn
blueprint "my-work" type "task" {
  version = 1

  part slot[] "check" {
    deps = []
  }
}
```

## 完整示例

```oxn
blueprint "deploy-mysql" type "task" {
  version = 1
  prop "env" { type = enum("dev", "prod"); default = "dev" }

  part slot[] "prepare" {
    deps = []
  }

  part slot[] "deploy" {
    deps = ["prepare"]
  }
}
```

## probes 参数速查

```
fs_exists:        { pattern: "glob模式" }
fs_not_exists:    { pattern: "glob模式" }
fs_content_match: { path: "文件路径", contains: "正则" }
exec_exit_zero:   { command: "shell命令" }
```

## 命令用法

### 提交 Work
```bash
oxn work submit --blueprint <path-to-blueprint.oxn> --work-id <work-id>
```

### 获取下一个 Part
```bash
oxn work next --work-id <workId>
```

### 验证 Part
```bash
oxn work verify --work-id <workId> --part-id <partId>
```

## Work 工作流

```
submit → next → execute → verify → (repeat until done)
```

1. submit：提交 Blueprint，创建 Work
2. next：获取当前需要执行的 Part
3. execute：AI 执行 Part 定义的工作
4. verify：验证 Part 是否通过
5. 循环直到所有 Part 完成

## ❌ 常见错误

1. **使用了旧类型名**
   ```
   # 错误
   type: fs_match        # 旧名，应改为 fs_content_match
   type: shell_exec      # 旧名，应改为 exec_exit_zero

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   ```

2. **fs_content_match 使用了错误的参数名**
   ```
   # 错误
   type: fs_content_match
   params:
     pattern: "*.ts"        # 错误：应该是 path
     contains: "export"

   # 正确
   type: fs_content_match
   params:
     path: "*.ts"
     contains: "export"
   ```