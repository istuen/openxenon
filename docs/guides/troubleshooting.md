# 故障排查

> OpenXenon v0.1 常见错误与修复。

## 1. 编译错误

### `oxn: command not found`
**原因**：未构建
**修复**：`pnpm build`

### `Cannot find module '@oxl'`
**原因**：依赖未装或构建顺序错
**修复**：
```bash
rm -rf node_modules dist
pnpm install
pnpm build
```

## 2. 初始化错误

### `OXN_NO_PROJECT`
**症状**：`oxn` 命令报 "项目未初始化"
**修复**：
```bash
oxn init
```

## 3. Domain 错误

### `oxn domain validate` 失败
**症状**：Domain 校验不通过
**修复**：
1. 检查语法：term 是 map 格式（`"X": "desc"`），不是 `noun "X" desc "..."`
2. 检查文件位置：必须在 `.openxenon/domains/<kebab>.oxn`
3. 检查 Domain 名：PascalCase

```oxn
// ❌ 旧语法（已删除）
domain "X" {
  noun "Member" desc "..."
  domain_rules { rule "X" desc "..." }
}

// ✅ 新语法
domain "X" {
  term { "Member": "..." }
  invariant { "..." }
}
```

## 4. Blueprint 错误

### `OXN_DSL_PARSE_FAILED`
**症状**：Blueprint 解析失败
**修复**：
1. 检查是否有 `expectation` / `rule` 块（已删除）
2. 检查 `observe` 是否是数组（`observe = ["ShellExec"]`，不是 `observe = probe`）
3. 检查 slot 是否有合法 `deps` 数组

```oxn
// ❌ 旧语法（已删除）
blueprint "X" {
  expectation "check" { ... }
  rule "rule1" { ... }
}

// ✅ 新语法
blueprint "X" {
  slot "build" { deps = [] observe = ["ShellExec"] }
}
```

## 5. Work / Task 错误

### `OXN_TASK_OXN_MISSING`
**症状**：`oxn work run` 报 work 声明的 task 缺 task.oxn
**修复**：
```bash
# 为每个 work.oxn 中的 task 创建 task.oxn
oxn work add-task --work <w> --task <t> --blueprint <bp> [--domain <d>]
```

### `OXN_BLUEPRINT_NOT_IN_WORK`
**症状**：`oxn work add-task` 报 blueprint 没在 work.oxn 声明
**修复**：在 work.oxn 顶部加：
```oxn
work "X" {
  blueprint "std" ref "@prj/blueprints/std";
  ...
}
```

### `OXN_DOMAIN_NOT_IN_WORK`
**症状**：同上但针对 domain
**修复**：在 work.oxn 顶部加：
```oxn
work "X" {
  domain "MemberContext" ref "@prj/domains/MemberContext";
  ...
}
```

### `task.oxn` 用了 task 关键字但语法错
**修复**：
```oxn
// ❌ 旧语法
task "X" blueprint "std" {
  inject "D"
  context { objective = "..." }
  slot "build" { deps = [] }
}

// ✅ 新语法
task "X" {
  blueprint "std"
  domain "D"
  part "build" { skill_context = "..." }
}
```

注意：
- `domain` / `blueprint` 字段不带分号
- `part` 块内用 `skill_context`，不是 `objective`
- 不再有独立的 `slot` 块

## 6. 状态机错误

### `OXN_WORK_ALREADY_EXISTS`
**症状**：`oxn work run` 报 work 已存在
**修复**：
```bash
oxn work status --work <w>   # 查看现有
rm .openxenon/works/<w>/state.json  # 手工清理（不推荐）
```

### `OXN_WORK_NOT_FOUND`
**症状**：`oxn work submit/status` 找不到 work
**修复**：先 `oxn work run`

## 7. 上下文错误

### `get-context` 返回空 `injectedDomains`
**原因**：task 没 align 任何 domain
**修复**：在 task.oxn 加：
```oxn
task "X" {
  domain "MemberContext";   // 必须显式声明
  ...
}
```

## 8. Probe 错误

### probe 块不生效
**原因**：v0.1 probe 块**仅作声明**，运行时未实装
**说明**：v0.2 接入 Kernel 判决。当前可以写 probe 块但 leader submit 不会真正跑它。

## 9. 迁移错误

### `oxn work migrate` 失败
**症状**：迁移 v0.0.x 旧 work.oxn 报错
**修复**：
1. 先用 `--dry-run` 预览
2. 手工检查旧 work.oxn 是否符合 v0.0.x 语法
3. 旧语法无 `inject` / `use_domain` 概念，需要手工升级

## 10. 测试错误

### `pnpm test` 失败
**修复**：
```bash
# 清理
rm -rf .opencode/skills

# 重新构建
pnpm build

# 重新测试
pnpm test
```

## 11. 调试技巧

### 查看 work-trace.jsonl
```bash
cat .openxenon/works/<w>/work-trace.jsonl | tail -20
```

### 查看 task-trace.jsonl
```bash
cat .openxenon/works/<w>/tasks/<t>/work-trace.jsonl | tail -20
```

### 查看 frozen.json
```bash
cat .openxenon/works/<w>/tasks/<t>/frozen.json | jq .
```

### 开启 verbose
```bash
oxn work run --work-file <path> --json -v
```

## 12. 仍未解决？

- 查看 [CLI 命令参考](../reference/cli-reference.md) 错误码表
- 查看 [OXN DSL 参考](../reference/oxl.md) 完整语法
- 在 GitHub Issues 搜索：https://github.com/istuen/openxenon/issues
