// =============================================================================
// Runtime Adapter — Factory (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §4.1, §5.4
//
// 工厂机制（arch-discussion §5.2 拍板）：
//   - 模块加载时一次性求值 `runtime = isBun() ? bunRuntime : nodeRuntime`
//   - 函数级便捷导出：handler 只需 `import { spawn } from '../../runtime/index'`
//   - handler 不知道 Bun/Node 存在（DX 最佳）
//
// Type B 接口（arch-discussion §5.4）：
//   - RuntimePort 在 L1-Infra 内部（不是 L0-Contract）
//   - 消费者是 L1/L2/L3 业务代码（probe handler），不是 kernel 纯函数
//   - 注入：直接模块 import + 工厂模式（非函数参数）
// =============================================================================

import { isBun } from './detect'
import { bunRuntime } from './bun/index'
import { nodeRuntime } from './node/index'
import type { GlobOptions, RuntimePort, SpawnOptions, SpawnResult } from './types'
import type { FileHandle } from './types'

/** 模块加载时一次性求值的 runtime 实例（v0.1.6 锁定） */
export const runtime: RuntimePort = isBun() ? bunRuntime : nodeRuntime

// =============================================================================
// 函数级便捷导出（最佳 DX）
//
// handler 只需 import 函数，不知 RuntimePort 存在。
// 例如：import { spawn } from '../../runtime/index'
// =============================================================================

export const spawn = (cmd: string[], opts?: SpawnOptions): Promise<SpawnResult> => runtime.spawn(cmd, opts)

export const openFile = (path: string): Promise<FileHandle> => runtime.openFile(path)

export const glob = (pattern: string, opts?: GlobOptions): Promise<string[]> => runtime.glob(pattern, opts)

export const which = (cmd: string): Promise<string | null> => runtime.which(cmd)

// 类型 re-export（供 handler 用）
export type { RuntimePort, SpawnResult, SpawnOptions, FileHandle, GlobOptions } from './types'
