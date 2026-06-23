---
entity: blueprint
version: 1
name: migrate-version
---

# Blueprint: migrate-version

> 跨大版本数据迁移：先盘点旧资产 → 预演迁移看到差异 → 手动修无法自动化的破坏 → 强制迁移 → 全量验证

## Props

### from_version
- type: string
- required: true

### to_version
- type: string
- required: true

### backup_dir
- type: string
- default: .openxenon/_migration_backup

## Slots

### inspect-old
- deps: []
- observe:
  - fs-match
  - fs-exists

### dry-run-migrate
- deps:
  - inspect-old
- observe:
  - shell-exec

### manual-fixes
- deps:
  - dry-run-migrate
- observe:
  - fs-content-match
  - fs-exists

### force-migrate
- deps:
  - manual-fixes
- observe:
  - shell-exec

### verify
- deps:
  - force-migrate
- observe:
  - lint-check
  - ts-compiles
  - test-pass
