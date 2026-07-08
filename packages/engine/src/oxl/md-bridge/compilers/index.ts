/**
 * md-bridge/compilers/index.ts — 8 个 EntityCompiler 注册入口 + barrel
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 * v0.6.1-alpha.1 Batch 2: 扩展 5 → 8 个 compiler（+ stack / library / external）
 *
 * 角色：
 * - import 即注册（ESM 副作用）
 * - 8 个 registerEntityCompiler(new XxxCompiler()) 一次调用
 * - barrel export 所有 compiler class
 *
 * 使用方必须 import 此文件以触发注册：
 *   import './compilers/index.js'
 *
 * 关键不变量：
 * - 同 type 重复注册时开发期 warn（生产期 silent 覆盖）
 * - barrel export 保证 tree-shaking 仍可识别（即使有副作用 import）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/compilers/）
 * - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import { registerEntityCompiler } from '../entity-registry.js'
import { DomainCompiler } from './domain-compiler.js'
import { BlueprintCompiler } from './blueprint-compiler.js'
import { StackCompiler } from './stack-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
import { LibraryCompiler } from './library-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
import { ExternalCompiler } from './external-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
import { WorkCompiler } from './work-compiler.js'
import { TaskCompiler } from './task-compiler.js'
import { ProofCompiler } from './proof-compiler.js'

// ========================
// 副作用：注册 8 个 EntityCompiler
// ========================

registerEntityCompiler(new DomainCompiler())
registerEntityCompiler(new BlueprintCompiler())
registerEntityCompiler(new StackCompiler()) // 🆕 v0.6.1-alpha.1 Batch 2
registerEntityCompiler(new LibraryCompiler()) // 🆕 v0.6.1-alpha.1 Batch 2
registerEntityCompiler(new ExternalCompiler()) // 🆕 v0.6.1-alpha.1 Batch 2
registerEntityCompiler(new WorkCompiler())
registerEntityCompiler(new TaskCompiler())
registerEntityCompiler(new ProofCompiler())

// ========================
// Barrel exports
// ========================

export { DomainCompiler } from './domain-compiler.js'
export { BlueprintCompiler } from './blueprint-compiler.js'
export { StackCompiler } from './stack-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
export { LibraryCompiler } from './library-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
export { ExternalCompiler } from './external-compiler.js' // 🆕 v0.6.1-alpha.1 Batch 2
export { WorkCompiler } from './work-compiler.js'
export { TaskCompiler } from './task-compiler.js'
export { ProofCompiler } from './proof-compiler.js'
export type { VerdictType } from './proof-compiler.js'
