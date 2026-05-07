## Context

当前 Arsenal 资产使用 `draft/` 子目录存放待审核状态，这带来几个问题：

1. **语义不清**：`draft/` 是状态，但 Unix 目录应该表达功能分组
2. **层级冗余**：Stage Arsenal 下又有 `draft/blueprint.yaml`，逻辑嵌套混乱
3. **迁移复杂**：目录 move vs 文件 mv 复杂度不同

**目标**：纯化到"文件名即状态"的物理映射，参考 Unix 文件系统哲学。

## Goals / Non-Goals

**Goals:**
- 实现 flat Arsenal 目录结构（无 draft/ 子目录）
- 确立 `draft.yaml` → `canonical.yaml` 状态晋升机制
- 统一 CLI 为 YAML→JSON 转换边界

**Non-Goals:**
- 不改变 Blueprint 内部结构
- 不改变 Daemon 探针执行逻辑
- 不实现 multi-file Arsenal（单资产单文件）

## Decisions

### Decision 1: 消除 draft/ 子目录，改用文件名状态

**选择**：每个 Arsenal 资产目录下直接放置 YAML 文件，不使用子目录

**理由**：
- Unix 哲学：目录表达命名空间，文件名表达具体资源
- 状态用文件名表达，而非目录层级
- 符合 `pure-filesystem-state` spec 的 path-derived state 原则

**Alternatives Considered**:
- 保留 draft/ 但改名 → 只是词汇污染转移
- 使用 x- 前缀 → 增加解析复杂度

### Decision 2: draft.yaml 作为临时状态，canonical.yaml 作为确权状态

**选择**：
- AI 生成未审核：`draft.yaml`
- 人类晋升后：`mv draft.yaml canonical.yaml`（物理消灭 draft）

**理由**：
- `mv` 是 POSIX 原子操作，比读写复制更安全
- 物理消灭 draft 文件，避免状态残留
- `canonical` 语义：权威的、标准的

**Alternatives Considered**:
- draft.md + canonical.md → 不适合机器执行
- draft.json + canonical.json → JSON 信噪比低

### Decision 3: CLI 作为 YAML→JSON 转换边界

**选择**：CLI 在 `socketRequest` 前将 Blueprint YAML 转为 JSON

**理由**：
- V8 原生 `JSON.parse()` 比 js-yaml 快 10x+
- Daemon 应该是"执行引擎"而非"解析引擎"
- 符合单一职责原则

## Risks / Trade-offs

- [Risk] 已有资产迁移：旧 `draft/blueprint.yaml` 格式需迁移脚本 → **Mitigation**：实现 `oxn migrate:arsenal` 命令
- [Risk] 用户困惑：没有 draft/ 目录后如何找到待审核资产 → **Mitigation**：提供 `oxn arsenal list --state draft` 查询

## Migration Plan

1. **Phase 1**：实现新目录结构解析（arsenals-loader 更新）
2. **Phase 2**：实现 `oxn-forge` 生成 `draft.yaml`
3. **Phase 3**：实现 `oxn arsenal promote` 使用文件 mv
4. **Phase 4**：提供迁移命令转换旧资产
