# Blueprint 格式参考

## OXN Mode (v3.1 Slot 范式)

```oxn
blueprint "deploy-mysql" {
  version = 1
  prop "env" { type = enum("dev", "prod"); default = "dev" }

  part slot "prepare" {
    deps = []
  }

  part slot "deploy" {
    deps = ["prepare"]
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

1. **使用了旧类型名**
   ```
   # 错误
   type: fs_match        # 旧名
   type: shell_exec      # 旧名

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   ```
