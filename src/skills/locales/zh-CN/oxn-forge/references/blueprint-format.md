# Blueprint 格式参考

## OXN Mode (v3.1 Slot 范式)

Blueprint 必须包含 `type` 字段，支持两种 Slot 声明：

### 单实例 Slot vs 多实例 Slot

| 语法 | 含义 | 使用场景 |
|------|------|----------|
| `part slot "name"` | 单实例 Slot，只能被一个 Part 填充 | 顺序执行的流程 |
| `part slots[] "name"` | 多实例 Slot，可被多个 Part 填充 | 并行/可扩展的工作 |

```oxn
blueprint "deploy-mysql" type "task" {
  version = 1
  prop "env" { type = enum("dev", "prod"); default = "dev" }

  part slot "prepare" {
    deps = []
  }

  part slots[] "worker" {
    deps = ["prepare"]
  }
}
```

### 单实例示例

```oxn
blueprint "ci-pipeline" type "task" {
  part slot "build" {
    deps = []
  }
  part slot "test" {
    deps = ["build"]
  }
  part slot "deploy" {
    deps = ["test"]
  }
}
```

### 多实例示例

```oxn
blueprint "scale-pipeline" type "task" {
  part slots[] "worker" {
    deps = []
  }
}
```

## Part 独立定义

Part 是 Arsenal 可复用资产：

```oxn
part "docker-prepare" {
  description = "确保 Docker 环境就绪"
  prop "image" { type = string; default = "mysql:8" }

  probe check_docker ref "@oxn/probes/exec-exit-zero" {
    params = { command = "docker ps" }
  }
  execution = [check_docker]
}
```

## probes 参数格式

```
fs_exists:        { pattern: "glob模式" }
fs_not_exists:    { pattern: "glob模式" }
fs_content_match: { path: "文件路径", contains: "正则" }
exec_exit_zero:   { command: "shell命令" }
```

## deps 规则

- deps 声明在 `part slot` 或 `part` 上
- 不能循环依赖（A→B→A）

## ❌ 常见错误

1. **Blueprint 缺少 type 字段**
   ```oxn
   # 错误
   blueprint "my-bp" {
     part slot "step" { }
   }

   # 正确
   blueprint "my-bp" type "task" {
     part slot "step" { }
   }
   ```

2. **使用了旧类型名**
   ```
   # 错误
   type: fs_match        # 旧名
   type: shell_exec      # 旧名

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   ```