# YAML 管线 Deprecation 公告

**生效日期**: Phase 4 完成日

## 摘要

OpenXenon 的 YAML/JSON 解析管线已进入 Deprecation 期。
所有新资产和 Blueprint 应使用 OXN DSL 格式 (`.oxn` 文件)。

## 时间线

| 阶段 | 时间 | 说明 |
|------|------|------|
| Phase 1-3 | 开发期 | 双轨共存：`.yaml` 和 `.oxn` 均可用 |
| Phase 4 | 当前 | YAML 管线标记 Deprecated |
| 后续版本 | TBD | YAML 管线下线，仅支持 `.oxn` |

## 迁移指南

### 手动迁移
使用 `oxn migrate-yaml <path>` 命令将现有 YAML Blueprint 转换为 OXN 格式。

```bash
# 迁移单个文件
oxn migrate-yaml .openxenon/arsenals/blueprints/my-bp/canonical.yaml

# 批量迁移
oxn migrate-yaml --dir .openxenon/arsenals/

# 迁移全部 Arsenal 资产
oxn migrate-yaml --all
```

### 关键变化

1. **Slot → Abstract Part**: YAML 的 `slot:` 机制已废弃，改用 `abstract part` 显式声明
2. **参数映射**: 从 `{{params.xxx}}` 改为 `prop.xxx` 显式引用
3. **类型系统**: 编译期强类型校验，enum/number/boolean 类型不匹配将被拦截
4. **Interface 契约**: 新增 `implements` 显式声明，编译器强制执行方法签名匹配

### OXN DSL 语法速查

```hcl
blueprint "my-task" {
  version = 1
  prop "env" { type = enum("dev", "staging", "prod"); default = "dev" }

  abstract part "worker" {
    implements = "deploy-interface"
    params = { target_env = prop.env }
  }

  stage "deploy" {
    run = part.worker.run
    deps = []
  }

  expectation "safety-check" {
    probe = "@oxn/probe/fs-exists"
    params = { pattern = "deploy.lock" }
    err_msg = "部署失败：锁定文件缺失"
  }

  rule "prod-safe" {
    condition = prop.env != "prod" || prop.safe_mode == true
    err_msg = "生产环境必须开启安全模式"
  }
}
```

## 帮助

如有迁移问题，请提交 Issue 到 GitHub 仓库。
