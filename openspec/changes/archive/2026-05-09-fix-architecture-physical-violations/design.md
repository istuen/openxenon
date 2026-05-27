## Context

三个物理倒灌违规需要修复：

```
┌──────────────────────────────────────────────────────────────────┐
│                     违规架构（当前）                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  daemon/registry.ts                                             │
│    └─ import { existsSync, readdirSync } from 'fs'  ← 直接 fs! │
│                                                                   │
│  kernel/lib/custom-proofs-scanner.ts                             │
│    └─ import { scanProjectProofsSync } from '../../infra/scanner'│
│                                                                   │
│  kernel/index.ts                                                 │
│    └─ export { scanProjectProofs, scanGlobalProofs }            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

这些问题是在实现 `implement-arsenal-registry-and-promote` 时引入的。开发者为了"方便"绕过了三权分立。

## Goals / Non-Goals

**Goals:**
- 消除所有物理倒灌违规
- 确保 Daemon Registry 通过 Infra 访问文件系统
- 确保 Kernel 不依赖 Infra
- 强化 ESLint 铁丝网

**Non-Goals:**
- 不改变系统功能（只改变实现位置）
- 不修改现有的 IPC 协议
- 不涉及其他模块

## Decisions

### Decision 1: Daemon Registry 重构

**问题**：`daemon/registry.ts` 直接导入 `fs`

**解决方案**：复用 `infra/loader.ts` 的扫描功能

```typescript
// Before (违规)
import { existsSync, readdirSync, readFileSync } from 'fs'
scanDirectory() { /* 直接读 fs */ }

// After (合规)
import { listStandards } from '../infra/loader'
import { parseYaml } from '../kernel'

buildIndex(projectBoundary: string): void {
  // 通过 Infra 读文件
  const assets = listStandards(projectBoundary, 'canonical', 'fallback')
  // 通过 Kernel 解析
  for (const asset of assets) {
    const parsed = parseYaml(asset.content)
    this.extractSemantics(parsed)
  }
}
```

### Decision 2: Kernel 导出清理

**问题**：`kernel/index.ts` 导出 `scan*` 函数

**解决方案**：
- 将 `scanProjectProofsSync`, `scanGlobalProofsSync`, `getGlobalProofsPath`, `getProjectProofsPath` 从 `kernel/index.ts` 删除
- 这些函数已经在 `infra/scanner.ts` 中，直接用 Infra 即可
- Kernel 只保留纯函数导出

### Decision 3: 清理 `custom-proofs-scanner.ts`

**问题**：Kernel 模块调用 Infra

**解决方案**：
- `kernel/custom-proofs-scanner.ts` 改为纯调度层
- I/O 逻辑在 `infra/scanner.ts` 中已经存在
- `kernel/custom-proofs-resolver.ts` 只保留纯函数

```typescript
// kernel/custom-proofs-scanner.ts 修正后
import { resolveCustomProofsRecursive } from './custom-proofs-resolver'
import { scanProjectProofsSync, scanGlobalProofsSync } from '../../infra/scanner'

export function scanProjectProofs(projectRoot: string): CustomProofConfig[] {
  const scanned = scanProjectProofsSync(projectRoot)
  return resolveCustomProofsRecursive(scanned, 'project')
}
```

### Decision 4: ESLint 规则强化

```javascript
// .eslintrc.cjs 新增规则
{
  files: ["src/daemon/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["node:fs", "fs"], message: "🚨 Daemon 不能直接导入 fs，必须通过 Infra！" }
        ]
      }
    ]
  }
},
{
  files: ["src/kernel/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["src/infra/**"], message: "🚨 Kernel 是兰姆达真空，不能知道 Infra 的存在！" }
        ]
      }
    ]
  }
}
```

## Risks / Trade-offs

- [Risk] 删除 Kernel 的 `scan*` 导出可能破坏现有调用方
  - → Mitigation: 先搜索所有调用点，确保它们改用 Infra

- [Risk] Daemon Registry 重构可能影响搜索性能
  - → Mitigation: `listStandards` 返回的 content 已经是字符串，无需重新读文件

## Open Questions

- 是否需要为 `daemon/registry.ts` 增加单元测试？

## Migration Plan

1. 先添加 ESLint 规则
2. 运行 ESLint，确认违规存在
3. 修复 `kernel/index.ts`（删除 scan* 导出）
4. 修复 `daemon/registry.ts`（改为调用 infra/loader）
5. 运行 ESLint，确认无违规
6. 构建并测试