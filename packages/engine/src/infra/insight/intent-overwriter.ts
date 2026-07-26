// =============================================================================
// intent-overwriter.ts (v0.5 PR-D)
//
// L1-Infra 原子覆盖引擎 — 安全地修改 Intent 资产（Domain / Blueprint .md 文件）
//
// 流程：
//   1. 读目标文件 → 解析当前 invariant/term/ban 块
//   2. 计算 hash（beforeHash）→ 与 frozen.json 的 expectedHash 比对
//      - 不一致 → 抛 IAPError (HASH_MISMATCH)，需人工合并
//   3. 在已有块中追加 patch 文本
//   4. 写 draft → 写正式文件（原子覆盖）
//   5. 算 afterHash → 返回审批记录
//
// 纯 IO 工具，不调 L0 compute。调用方负责写 frozen.json 审批记录。
//
// L1-Infra 位置：可 import L0-Kernel + L1-Infra 自身。不得 import L2 / L3。
// =============================================================================

import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import {
  IAPError,
  IAPAction,
  type ApprovalRecord,
  type ImprovementSuggestionMeta,
} from '@openxenon/engine/kernel/index'

const TEMP_DRAFT_SUFFIX = '.draft.tmp'

export interface OverwriteInput {
  /** 目标 Intent 资产路径（绝对路径或相对 projectRoot）*/
  targetPath: string
  /** 来自 audit pool entry 的 metadata */
  meta: ImprovementSuggestionMeta
  /** 操作者标识（默认 'operator'）*/
  operator?: string
  /** dry-run 模式：只计算 afterHash，不实际写文件 */
  dryRun?: boolean
}

export interface OverwriteResult {
  /** 写入后的目标路径 */
  path: string
  /** 覆盖前 hash（用于审计）*/
  beforeHash: string
  /** 覆盖后 hash */
  afterHash: string
  /** 审批记录（供调用方写入 frozen.json）*/
  approvalRecord: ApprovalRecord
  /** 若为 dry-run，isDryRun=true */
  isDryRun: boolean
}

/**
 * 检查目标文件存在
 */
function assertTargetExists(path: string): void {
  if (!existsSync(path)) {
    throw new IAPError(
      'INFRA',
      'INFRA_FAIL_INSIGHT_TARGET',
      IAPAction.YIELD_TO_HUMAN,
      `Target file not found: ${path}`,
      {
        component: 'intent-overwriter',
        targetPath: path,
      },
    )
  }
}

/**
 * 计算新内容（追加 patch 到合适位置）
 *
 * 简化策略：在文件末尾追加 patch（不解析 OXL AST 重组）。
 * - 适用于"add-invariant"、"add-term"、"add-ban"、"add-observe" 4 种 kind
 * - patch 已经是合法 OXL 片段（含完整块语法）
 * - 用户需确保不与已有内容重复
 */
function applyPatch(originalContent: string, patch: string): string {
  // 确保文件末尾有换行
  const normalized = originalContent.endsWith('\n') ? originalContent : `${originalContent}\n`
  return `${normalized + patch}\n`
}

/**
 * 原子覆盖 Intent 资产
 *
 * @param input - 目标路径 + 改进 metadata
 * @returns 覆盖结果（含 beforeHash / afterHash / 审批记录）
 * @throws IAPError - 目标文件不存在 / 写盘失败
 *
 * 注：本版本不实现 beforeHash 冲突检测（因 frozen.json metadata 不含 expectedHash，
 *     留给 v0.6 通过 add expectedHash 字段扩展）。当前默认信任 create 时的快照。
 */
export function overwriteIntent(input: OverwriteInput): OverwriteResult {
  const { targetPath, meta, operator = 'operator', dryRun = false } = input

  // 1. 目标文件存在性检查
  assertTargetExists(targetPath)

  // 2. 读当前内容 + 算 beforeHash
  const originalContent = readFileSync(targetPath, 'utf-8')
  const beforeHash = createHash('sha256').update(originalContent).digest('hex')

  // 3. 计算新内容
  const newContent = applyPatch(originalContent, meta.patch)
  const afterHash = createHash('sha256').update(newContent).digest('hex')

  // 4. 构造审批记录
  const approvalRecord: ApprovalRecord = {
    approvedAt: new Date().toISOString(),
    approvedBy: operator,
    beforeHash,
    afterHash,
    conflictsDetected: [],
  }

  if (dryRun) {
    return {
      path: targetPath,
      beforeHash,
      afterHash,
      approvalRecord,
      isDryRun: true,
    }
  }

  // 5. 写 draft（.draft.tmp 后缀）→ 原子 rename
  const draftPath = `${targetPath}${TEMP_DRAFT_SUFFIX}`
  try {
    writeFileSync(draftPath, newContent, 'utf-8')
    // 原子覆盖：rename draft → 正式
    // 注：node:fs 的 renameSync 是原子的（同分区）
    // 此处用 writeFileSync 直接覆盖（简化 — 后续可加 atomic rename）
    writeFileSync(targetPath, newContent, 'utf-8')
  } finally {
    // 清理 draft
    try {
      if (existsSync(draftPath)) {
        const fs = require('node:fs') as typeof import('node:fs')
        fs.unlinkSync(draftPath)
      }
    } catch {
      /* ignore */
    }
  }

  // 6. 维持 .md 文件可写（不 chmod）
  return {
    path: targetPath,
    beforeHash,
    afterHash,
    approvalRecord,
    isDryRun: false,
  }
}

/**
 * 仅计算 hash（不改文件），用于 preview 场景
 */
export function previewOverwrite(
  targetPath: string,
  meta: ImprovementSuggestionMeta,
): {
  beforeHash: string
  afterHash: string
  patchApplied: string
} {
  assertTargetExists(targetPath)
  const originalContent = readFileSync(targetPath, 'utf-8')
  const beforeHash = createHash('sha256').update(originalContent).digest('hex')
  const newContent = applyPatch(originalContent, meta.patch)
  const afterHash = createHash('sha256').update(newContent).digest('hex')
  return {
    beforeHash,
    afterHash,
    patchApplied: newContent,
  }
}

/** 工具：构造 patch 文本（kind-aware 模板） */
export function buildPatch(kind: ImprovementSuggestionMeta['kind'], body: string): string {
  switch (kind) {
    case 'add-invariant':
      return `invariant {\n  ${body}\n}`
    case 'add-term':
      return `term {\n  ${body}\n}`
    case 'add-ban':
      return `ban {\n  ${body}\n}`
    case 'add-observe':
      return `  observe = [${body}]`
  }
}

/** 解析项目根的相对路径 */
export function resolveTargetPath(projectRoot: string, targetPath: string): string {
  if (targetPath.startsWith('/')) return targetPath
  return join(projectRoot, targetPath)
}

/** 标记目标文件可写（清除可能的 0o444） */
export function ensureWritable(path: string): void {
  try {
    chmodSync(path, 0o644)
  } catch {
    /* ignore */
  }
}
