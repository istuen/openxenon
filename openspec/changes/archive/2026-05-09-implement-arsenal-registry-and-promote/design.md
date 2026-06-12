## Context

根据大法官裁决（history-1.md）：
1. **Arsenal Registry 必须在 Daemon**：CLI 无状态，无法持有内存索引
2. **Promote 必须是 CLI 命令**：需要验证+裁决+记录三步，不能只是文件操作

当前系统：
- Arsenal（Probe/Proof/Stage/Blueprint）散落在 `arsenals/` 目录
- AI 无法高效查询"有哪些 Arsenal 可用"
- 资产演化（DRAFT → PROMOTED）依赖手动文件操作，无追踪记录

## Goals / Non-Goals

**Goals:**
- Daemon 启动时构建 Arsenal Registry 内存索引
- CLI 提供 `oxn arsenal search` 命令查询 Registry
- CLI 提供 `oxn arsenal promote` 命令触发完整链路
- 所有 Arsenal canonical.yaml 包含 `semantics` 语义标注

**Non-Goals:**
- 不修改 Daemon 的 IPC 协议（Socket JSON 格式保持不变）
- 不涉及 Infra 层的探针执行逻辑
- 不实现 Blueprint 模板的 AI 生成（那是 Forge 的职责）

## Decisions

### Decision 1: Registry 数据结构

```typescript
// src/daemon/registry.ts
interface ArsenalEntry {
  name: string
  type: AssetType  // 'probes' | 'proofs' | 'stages' | 'blueprints'
  state: AssetState  // 'draft' | 'canonical'
  path: string
  semantics: {
    intent: string       // 用途描述
    tags: string[]       // 标签列表
    useWhen: string      // 使用场景描述
    relatedAssets: string[]  // 相关资产
  }
}

class ArsenalRegistry {
  private entries: Map<string, ArsenalEntry>  // key: path

  buildIndex(): void {
    // 1. 扫描全局 ARSENALS_ROOT
    // 2. 扫描项目 .openxenon/arsenals/
    // 3. 解析每个 canonical.yaml，提取 semantics
    // 4. 存入 Map
  }

  search(query: string): ArsenalEntry[] {
    // 模糊匹配：name, intent, tags
  }

  getByType(type: AssetType): ArsenalEntry[]
}
```

### Decision 2: Daemon 启动时构建索引

```typescript
// src/daemon/entry.ts
import { ArsenalRegistry } from './registry'

const registry = new ArsenalRegistry()

// 在 Daemon 初始化时
registry.buildIndex()

// 广播 ready 事件
console.log(`Arsenal Registry ready: ${registry.size()} assets indexed`)
```

### Decision 3: CLI Search 命令

```bash
# 工程师/AI 执行
oxn arsenal search "Laravel"

# CLI → Socket → Daemon
{ action: "arsenal_search", query: "Laravel" }

# Daemon 返回
{
  "matches": [
    { "name": "fs-exists", "type": "probes", "semantics": { "intent": "检查文件存在", "tags": ["fs"] } },
    { "name": "install-laravel", "type": "stages", "semantics": { "intent": "安装 Laravel", "tags": ["php", "install"] } }
  ]
}
```

### Decision 4: CLI Promote 命令

```bash
# 工程师执行
oxn arsenal promote http-check

# CLI → Socket → Daemon
{ action: "arsenal_promote", asset: "http-check", assetType: "probes" }

# Daemon 处理流程
1. 读取 .openxenon/arsenals/probes/http-check/draft.yaml
2. 调用 Kernel/schemas 校验结构
3. 如果校验失败 → 返回错误
4. 如果校验通过:
   a. renameSync(draft.yaml, canonical.yaml)
   b. 更新 Registry 内存
   c. trace/writer 追加 PROMOTE 事件
   d. 返回成功
```

### Decision 5: semantics 字段规范

```yaml
# arsenals/probes/fs-exists/canonical.yaml
type: fs_exists
description: "检查文件系统中是否存在匹配的路径"
semantics:
  intent: "验证文件/目录的存在性"
  tags: ["文件系统", "存在性检查", "fs"]
  useWhen: "当你需要确认某个文件或目录已被创建时"
  relatedAssets: ["fs_not_exists", "fs_match"]
```

## Risks / Trade-offs

- [Risk] Daemon 启动时扫描大量文件可能较慢
  - → Mitigation: 使用 glob 批量匹配，异步构建；首次构建后增量更新

- [Risk] Registry 内存占用
  - → Mitigation: Registry 只存元数据（路径、semantics），不存 content；按需懒加载 content

## Open Questions

- Registry 是否需要持久化（存到文件）？建议初始版本仅内存，启动时重建