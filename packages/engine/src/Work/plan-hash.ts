// =============================================================================
// plan-hash.ts — PR-2
//
// 稳定 hash 工具：把 work 计划（work.oxn + 引用资产）算成可复算的 sha256 hex。
//
// 用途：
//   1. .work.planLock 字段：lock 时算 4 个组件 hash + 一个 combined hash；
//   2. 后续 run / context / submit 前再算一次，比对是否被篡改；
//   3. AI 报错时能精确定位"哪个文件漂了"（planLock.reason 指向具体组件）。
//
// 稳定性要求（关键）：
//   - CRLF / LF 归一化（Windows 提交 → Linux CI 不漂）
//   - 末尾空白 / BOM 不参与 hash
//   - tasks/<t>/task.oxn 的 hash 顺序按 task 名排序（不同 add 顺序同 DAG 应同 hash）
//   - file 不存在 → hash 为 null（不是抛错）；调用方决定缺文件是 fail 还是 warn
//
// 复用 infra/hash 现有 HashPort，避免重复造轮子。
// =============================================================================

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from '@openxenon/engine/infra/filesystem'
import { join, relative } from 'path'
import { hashPort } from '@openxenon/engine/infra/hash'
import { WORK_DOMAINS_JSON, WORK_BLUEPRINTS_JSON } from '@openxenon/engine/kernel'
import { getWorkDir, getWorkOxnPath } from './dual-state-io'

// ───────── 文本 hash（归一化）─────────

/**
 * 文本归一化：
 *   - 去 BOM (\uFEFF)
 *   - CRLF → LF
 *   - 末尾多余空行折叠（保留 1 个 LF）
 *
 * 这保证：同一 work.oxn 在不同 OS / 编辑器下 hash 一致。
 */
export function normalizeText(text: string): string {
  let s = text
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  s = s.replace(/\r\n/g, '\n')
  s = s.replace(/\r/g, '\n')
  // 折叠末尾连续空行（保留 1 个）
  s = s.replace(/\n+$/, '\n')
  return s
}

/**
 * 文本 → sha256 hex。归一化后计算。
 */
export function hashText(text: string): string {
  return hashPort.computeHash(normalizeText(text))
}

// ───────── 文件 hash（容错）─────────

/**
 * 文件 → sha256 hex。文件不存在返回 null（不是抛错）。
 *
 * 用途：planLock 计算时允许某些文件尚未生成（如 per-work domains.json 在
 *       PR-3 之前不存在）；返回 null 后由调用方决定如何处理。
 */
export function hashFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null
  try {
    const content = readFileSync(filePath, 'utf-8')
    return hashText(content)
  } catch {
    return null
  }
}

// ───────── 路径工具（仅 per-work 新文件；work.oxn / tasks/<t>/ 复用 dual-state-io）─────────

export function getWorkDomainsJsonPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_DOMAINS_JSON)
}

export function getWorkBlueprintsJsonPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_BLUEPRINTS_JSON)
}

/** Re-export：让消费方只需 import 一处 */
export { getWorkDir, getWorkOxnPath } from './dual-state-io'

// ───────── 任务列表（稳定排序）─────────

/**
 * 列出 work 下所有 task.oxn，按 task 名排序。
 * 排序保证：不同 add 顺序但同 DAG 的 hash 一致。
 *
 * 跳过：
 *   - 隐藏文件 / 目录
 *   - 无 task.oxn 的目录（不该被视作 task）
 *   - 非目录条目
 */
export function listTaskFiles(
  projectRoot: string,
  workName: string,
): Array<{
  taskName: string
  filePath: string
  hash: string | null
}> {
  const tasksDir = join(getWorkDir(projectRoot, workName), 'tasks')
  if (!existsSync(tasksDir)) return []

  let entries: string[]
  try {
    entries = readdirSync(tasksDir)
  } catch {
    return []
  }

  const out: Array<{ taskName: string; filePath: string; hash: string | null }> = []
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const dir = join(tasksDir, name)
    let isDir = false
    try {
      isDir = statSync(dir).isDirectory()
    } catch {
      continue
    }
    if (!isDir) continue
    const taskOxn = join(dir, 'task.oxn')
    if (!existsSync(taskOxn)) continue
    out.push({
      taskName: name,
      filePath: taskOxn,
      hash: hashFile(taskOxn),
    })
  }
  out.sort((a, b) => a.taskName.localeCompare(b.taskName))
  return out
}

// ───────── Plan hash（顶层入口）─────────

/**
 * Plan hash 4 组件 + 1 combined：
 *   - workOxnHash       work.oxn 自身
 *   - workDomainsHash   works/<w>/domains.json  （per-work slim；PR-3 写入）
 *   - blueprintsHash    works/<w>/blueprints.json （per-work slim；PR-3 写入）
 *   - tasksHash         所有 tasks/<t>/task.oxn 的组合 hash（按 task 名排序）
 *   - allHash           上面 4 个的稳定组合（用同样顺序的 normalize 后字符串再 hash）
 *
 * 任何组件缺失 → hash 为 null；call 端用 Object.values(...).every(h => h) 判定完整性。
 */
export interface PlanHash {
  workOxnHash: string | null
  workDomainsHash: string | null
  blueprintsHash: string | null
  tasksHash: string | null
  /** 上面 4 个的组合 hash（缺一即 null） */
  allHash: string | null
  /** 缺失/不可读的组件名（用于 AI 报告） */
  missing: string[]
}

export function hashWorkPlan(projectRoot: string, workName: string): PlanHash {
  const workOxnHash = hashFile(getWorkOxnPath(projectRoot, workName))
  const workDomainsHash = hashFile(getWorkDomainsJsonPath(projectRoot, workName))
  const blueprintsHash = hashFile(getWorkBlueprintsJsonPath(projectRoot, workName))

  const taskFiles = listTaskFiles(projectRoot, workName)
  const missingTasks = taskFiles.filter((t) => t.hash === null).map((t) => t.taskName)
  const tasksHash =
    taskFiles.length === 0
      ? null
      : taskFiles.every((t) => t.hash !== null)
        ? hashPort.computeHash(taskFiles.map((t) => `${t.taskName}=${t.hash}`).join('\n'))
        : null

  const missing: string[] = []
  if (workOxnHash === null) missing.push('work.oxn')
  if (workDomainsHash === null) missing.push('domains.json')
  if (blueprintsHash === null) missing.push('blueprints.json')
  missing.push(...missingTasks.map((t) => `tasks/${t}/task.oxn`))

  const allHash =
    workOxnHash !== null && workDomainsHash !== null && blueprintsHash !== null && tasksHash !== null
      ? hashPort.computeHash(
          [
            `work.oxn=${workOxnHash}`,
            `domains.json=${workDomainsHash}`,
            `blueprints.json=${blueprintsHash}`,
            tasksHash,
          ].join('\n'),
        )
      : null

  return { workOxnHash, workDomainsHash, blueprintsHash, tasksHash, allHash, missing }
}

// ───────── 单文件 hash 工具（直接暴露给 CLI 调试用）─────────

/**
 * 直接算一个字符串的 sha256 hex（用 node:crypto，不走 HashPort —— 调试用）。
 * 主要供 CLI 子命令 `--print-hash` 之类场景。
 */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(normalizeText(text)).digest('hex')
}

/** 静默探测：列出 works/<w>/ 下所有 4 个组件的实际状态 */
export interface PlanPresence {
  workOxn: boolean
  domainsJson: boolean
  blueprintsJson: boolean
  tasks: Array<{ taskName: string; hasOxn: boolean }>
}

export function probePlanPresence(projectRoot: string, workName: string): PlanPresence {
  return {
    workOxn: existsSync(getWorkOxnPath(projectRoot, workName)),
    domainsJson: existsSync(getWorkDomainsJsonPath(projectRoot, workName)),
    blueprintsJson: existsSync(getWorkBlueprintsJsonPath(projectRoot, workName)),
    tasks: listTaskFiles(projectRoot, workName).map((t) => ({
      taskName: t.taskName,
      hasOxn: t.hash !== null,
    })),
  }
}

// ───────── 资产 hash（domain/blueprint refs）─────────

/**
 * 给 asset list（[{name, scope?, version, filePath}]）算组合 hash。
 * 用于 .work.assets.<type> 锁：把引用的 domain/blueprint 的当前文件 hash
 * 快照下来，将来如果 .oxn 改了但 work.oxn 没改，assets 就能警告"资产漂了"。
 */
export function hashAssetList(
  assets: Array<{ name: string; scope?: string; version: number; filePath: string }>,
): string {
  // 按 name 排序；缺文件 hash 仍记入（值为 MISSING）以保证幂等
  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name))
  const lines = sorted.map((a) => {
    const h = hashFile(a.filePath) ?? 'MISSING'
    return `${a.name}@${a.scope ?? '@prj'}#${a.version}=${h}`
  })
  return hashPort.computeHash(lines.join('\n'))
}

// ───────── 内部 helper：把 relative path 转 projectRoot-relative 字符串 ─────────

/** 给 AI 看时去掉 projectRoot 前缀，只留 .openxenon/... 相对路径 */
export function relPath(projectRoot: string, absPath: string): string {
  return relative(projectRoot, absPath) || absPath
}
