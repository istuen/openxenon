## Context

当前 arsenals 采用扁平结构：
```
arsenals/
  blueprint/
    draft/
      build-init-daemon.yaml
      other-asset.yaml
```

问题：
1. 同名资产无法区分不同版本
2. 目录层级浅，扩展性差
3. 难以管理资产的生命周期（draft → canonical）

## Goals / Non-Goals

**Goals:**
- 建立清晰的目录分层结构
- 支持资产的 draft/canonical 双版本
- 保持与现有 API 的兼容

**Non-Goals:**
- 不修改现有资产的内部格式
- 不强制迁移已有资产文件（保持兼容读取即可）

### Decision 3: 迁移方案

**选择：**
提供 `oxn arsenal migrate` 命令，一次性将旧路径资产迁移到新结构。

**迁移流程：**
1. 扫描 `arsenals/<type>/draft/*.yaml` 和 `arsenals/<type>/canonical/*.yaml`
2. 对每个旧文件，在新路径创建对应文件
3. 默认删除旧文件，可通过 `--keep-old` 保留
4. 输出迁移日志（成功/失败/跳过）

**理由：**
- 用户主动触发迁移，而非自动强制
- 支持保留旧文件作为备份
- 迁移过程可追溯

## Decisions

### Decision 1: 新目录结构

**选择：**
```
arsenals/
  <type>/
    <asset-name>/
      draft.yaml
      canonical.yaml
```

**理由：**
- 同一资产的不同版本在同一目录下，便于管理
- 文件名固定（draft.yaml/canonical.yaml），目录名承载资产身份
- 层级清晰：`arsenals/type/asset-name/version-file`

**替代方案考虑：**
- `arsenals/<type>-<asset-name>/draft.yaml`：目录名带类型前缀 → 冗余，因为父目录已包含类型
- `arsenals/<type>/<asset-name>/v1/draft.yaml`：引入版本号 → 过度设计，draft/canonical 已是版本机制

### Decision 2: 向后兼容

**选择：**
读取时同时支持旧路径和新路径，写入只写新路径。

**理由：**
- 渐进式迁移，用户已有资产不受影响
- 新生成的资产使用新结构

## Risks / Trade-offs

- **迁移过程出错** → 迁移前自动备份，支持 `--keep-old` 回滚
- **迁移遗漏资产** → 迁移后验证所有资产可读取

## Open Questions

1. ~~是否需要提供迁移脚本，将旧路径资产迁移到新结构？~~ **已确认：需要**
2. global 级别的 arsenals 是否采用相同结构？