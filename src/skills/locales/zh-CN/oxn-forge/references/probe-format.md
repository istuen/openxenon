# Probe 格式参考

## OXN Mode（推荐，Phase 1+）

```hcl
probe "fs-exists" {
  description = "检查文件存在"
  prop "pattern" { type = string; required = true }
}
```

## Forge 格式 vs Blueprint 格式（⚠️ 最常见的混淆）

Forge 定义的是"能力声明"（我需要什么参数）：
```hcl
type: fs_exists
description: "检查文件存在"
props:           ← 注意：是数组
  - name: pattern
    type: string
    required: true
```

Blueprint 定义的是"调用方式"（我传什么值）：
```hcl
type: fs_exists
params:               ← 注意：是对象
  pattern: "src/**/*.ts"
```

⚠️ `oxn forge probe -s` 用的是 Forge 格式，不是 Blueprint 格式！

## 各类型参数速查

### fs_exists
参数：pattern (string, required) — glob 模式

示例：
```hcl
type: fs_exists
description: "检查配置文件存在"
props:
  - name: pattern
    type: string
    required: true
    description: "要检查的文件 glob 模式"
```

### fs_not_exists
参数：pattern (string, required) — glob 模式

示例：
```hcl
type: fs_not_exists
description: "检查临时文件已清理"
props:
  - name: pattern
    type: string
    required: true
    description: "不应存在的文件模式"
```

### fs_content_match
参数：path (string, required) + contains (string, required)

示例：
```hcl
type: fs_content_match
description: "检查源码包含版权声明"
props:
  - name: path
    type: string
    required: true
    description: "要检查的文件路径（glob 模式）"
  - name: contains
    type: string
    required: true
    description: "文件内容必须匹配的正则"
```

### exec_exit_zero
参数：command (string, required)

示例：
```hcl
type: exec_exit_zero
description: "执行 lint 检查"
props:
  - name: command
    type: string
    required: true
    description: "要执行的 shell 命令"
```

## ❌ 常见错误

1. **Forge 格式写成 Blueprint 格式**
   ```hcl
   # 错误
   type: fs_exists
   params: { pattern: "src" }

   # 正确
   type: fs_exists
   props: [{ name: pattern, type: string, required: true }]
   ```

2. **props 里的 name 和 type 写反**
   ```hcl
   # 错误
   props: [{ type: pattern, name: string }]

   # 正确
   props: [{ name: pattern, type: string }]
   ```

3. **使用了旧类型名**
   ```hcl
   # 错误
   type: fs_match         # 旧名，应改为 fs_content_match
   type: shell_exec       # 旧名，应改为 exec_exit_zero

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   ```

4. **fs_content_match 使用了错误的参数名**
   ```hcl
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
