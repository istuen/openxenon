/**
 * md-bridge/compilers/index.ts — EntityCompiler 注册入口 + barrel
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 * v0.6.1-alpha.1 Batch 2: 扩展 5 → 8 个 compiler（+ stack / library / external）
 * v0.6.1-alpha.4 Phase 2: library/external entity 类型删除 → 8 → 6 个 compiler
 *   + 新建 workflow-compiler（Phase 0 改名的执行模板，原 blueprint slots/deps/observe）
 *
 * 角色：
 * - import 即注册（ESM 副作用）
 * - 6 个 registerEntityCompiler(new XxxCompiler()) 一次调用
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
import { BlueprintCompiler } from './blueprint-compiler.js' // 🆕 Phase 2: 新语义（组合模板 ## Refs）
import { WorkflowCompiler } from './workflow-compiler.js' // 🆕 v0.6.1-alpha.2/4: 原 blueprint 改名（执行模板 slots/deps/observe）
import { StackCompiler } from './stack-compiler.js'
import { RoadmapCompiler } from './roadmap-compiler.js'
import { WorkCompiler } from './work-compiler.js'
import { TaskCompiler } from './task-compiler.js'
import { ProofCompiler } from './proof-compiler.js'

// ========================
// 副作用：注册 6 个 EntityCompiler（Phase 2 收敛：library/external 删除）
// ========================

registerEntityCompiler(new DomainCompiler())
registerEntityCompiler(new BlueprintCompiler()) // 🆕 新语义：组合模板
registerEntityCompiler(new WorkflowCompiler()) // 🆕 原 blueprint 改名
registerEntityCompiler(new StackCompiler())
registerEntityCompiler(new RoadmapCompiler())
registerEntityCompiler(new WorkCompiler())
registerEntityCompiler(new TaskCompiler())
registerEntityCompiler(new ProofCompiler())

// ========================
// Barrel exports
// ========================

export { DomainCompiler } from './domain-compiler.js'
export { BlueprintCompiler } from './blueprint-compiler.js'
export { WorkflowCompiler } from './workflow-compiler.js' // 🆕 v0.6.1-alpha.4
export { StackCompiler } from './stack-compiler.js'
export { RoadmapCompiler } from './roadmap-compiler.js'
export { WorkCompiler } from './work-compiler.js'
export { TaskCompiler } from './task-compiler.js'
export { ProofCompiler } from './proof-compiler.js'
export type { VerdictType } from './proof-compiler.js'
export { EXTERNAL_KINDS, validateExternal, validateExternals } from './external-validate.js'
export type { ExternalKind, ExternalEntry } from './external-validate.js'
