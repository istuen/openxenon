// =============================================================================
// work-migrator.ts — PR-10
//
// 把 V0 旧布局 work 一次性迁到 V1（.run/ 目录 + .work + slim 索引）。
//
// V0 旧布局（PR-4 之前）：
//   works/<w>/
//     work.md
//     work-state.json / work-trace.jsonl / work-frozen.json   ← 根目录
//     tasks/<t>/
//       task.md
//       task-state.json / task-trace.jsonl / task-frozen.json ← task 子目录
//
// V1 新布局（PR-4 切换）：
//   works/<w>/
//     work.md                           [保留]
//     tasks/<t>/task.md                 [保留]
//     .run/                             [新增]
//       state.json / trace.jsonl / frozen.json
//       tasks/<t>/
//         state.json / trace.jsonl / frozen.json
//     .work                             [新增] 出生证明（planLock=null，assets 重新算）
//     domains.json / blueprints.json    [新增] per-work slim 索引
//
// 迁移策略（M3 硬切）：
//   1. 检测 V0 旧布局：work-state.json 存在但 .run/state.json 不存在
//   2. 移动文件：
//        works/<w>/work-state.json        → works/<w>/.run/state.json
//        works/<w>/work-trace.jsonl       → works/<w>/.run/trace.jsonl
//        works/<w>/work-frozen.json       → works/<w>/.run/frozen.json
//        works/<w>/tasks/<t>/task-state.json   → works/<w>/.run/tasks/<t>/state.json
//        works/<w>/tasks/<t>/task-trace.jsonl  → works/<w>/.run/tasks/<t>/trace.jsonl
//        works/<w>/tasks/<t>/task-frozen.json  → works/<w>/.run/tasks/<t>/frozen.json
//   3. 重新生成：
//        works/<w>/.work                          （PR-2/6）
//        works/<w>/domains.json + blueprints.json （PR-3/6）
//   4. 备份 V0 旧文件到 works/<w>/.migrated-v0/（不删，工程师手动清理）
//   5. 返回迁移报告：移动文件数、产物重写状态
//
// 幂等性：
//   - V1 已迁：拒绝（"already migrated"）
//   - V0 不存在（既没 work-state.json 也没 .run/）：拒绝（"nothing to migrate"）
//   - 半 V0（部分 task 没 task-state.json）：部分迁移 + warning 报告
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR, RUN_DIR, RUN_TASKS_SUBDIR, WORK_FILE } from '@openxenon/engine/kernel'
// 🆕 v0.6.1-alpha.4 Phase B: 删除 buildPerWorkDomainsIndex/writePerWorkDomainsIndex/getPerWorkDomainsJsonPath import
import {
  buildPerWorkBlueprintsIndex,
  writePerWorkBlueprintsIndex,
  getPerWorkBlueprintsJsonPath,
} from './per-work-blueprints-merger'
import { createBirthCert, writeWorkFile, type BirthCert } from './birth-cert'
import { hashFile } from './plan-hash'

// ───────── V0 路径常量（硬编码的旧命名）─────────

const V0_WORK_STATE = 'work-state.json'
const V0_WORK_TRACE = 'work-trace.jsonl'
const V0_WORK_FROZEN = 'work-frozen.json'
const V0_TASK_STATE = 'task-state.json'
const V0_TASK_TRACE = 'task-trace.jsonl'
const V0_TASK_FROZEN = 'task-frozen.json'

// ───────── 探测 ─────────

export interface ProbeV0Result {
  isV0: boolean
  /** 至少一个 V0 旧文件存在 */
  hasAnyV0File: boolean
  /** 已经有 V1 产物（.run/state.json） */
  hasV1Artifacts: boolean
  v0Files: Array<{ rel: string; abs: string }>
  missingV0Files: string[]
}

/**
 * 探测 work 目录，列出 V0 旧文件 + 报告是否已 V1 化。
 *
 * isV0 = hasAnyV0File && !hasV1Artifacts（部分迁移视为已 V1）
 */
export function probeV0Layout(projectRoot: string, workName: string): ProbeV0Result {
  const workDir = join(projectRoot, BOUNDARY_DIR, 'works', workName)
  const v0Files: Array<{ rel: string; abs: string }> = []
  const missingV0Files: string[] = []

  // work 根目录的 3 个 V0 文件
  const rootV0 = [
    { rel: 'work-state.json', abs: join(workDir, V0_WORK_STATE) },
    { rel: 'work-trace.jsonl', abs: join(workDir, V0_WORK_TRACE) },
    { rel: 'work-frozen.json', abs: join(workDir, V0_WORK_FROZEN) },
  ]

  // 每个 task 的 3 个 V0 文件
  const tasksDir = join(workDir, 'tasks')
  let taskNames: string[] = []
  if (existsSync(tasksDir)) {
    try {
      taskNames = readdirSync(tasksDir)
    } catch {
      // ignore
    }
  }
  const taskV0List: Array<{ rel: string; abs: string; taskName: string }> = []
  for (const t of taskNames) {
    if (t.startsWith('.')) continue
    for (const f of [V0_TASK_STATE, V0_TASK_TRACE, V0_TASK_FROZEN]) {
      taskV0List.push({
        rel: `tasks/${t}/${f}`,
        abs: join(tasksDir, t, f),
        taskName: t,
      })
    }
  }

  let hasAnyV0File = false
  for (const f of rootV0) {
    if (existsSync(f.abs)) {
      v0Files.push({ rel: f.rel, abs: f.abs })
      hasAnyV0File = true
    }
  }
  for (const f of taskV0List) {
    if (existsSync(f.abs)) {
      v0Files.push({ rel: f.rel, abs: f.abs })
      hasAnyV0File = true
    } else {
      // 只记录 task-level 缺失（与 task 存在但文件缺失区分）
      const taskMd = join(tasksDir, f.taskName, 'task.md')
      if (existsSync(taskMd)) {
        missingV0Files.push(f.rel)
      }
    }
  }

  const hasV1Artifacts = existsSync(join(workDir, RUN_DIR, 'state.json'))
  const isV0 = hasAnyV0File && !hasV1Artifacts

  return { isV0, hasAnyV0File, hasV1Artifacts, v0Files, missingV0Files }
}

// ───────── 备份辅助（copy 而非 move；V0 文件留作审计）─────────

function copyV0ToBackup(
  projectRoot: string,
  workName: string,
  files: Array<{ rel: string; abs: string }>,
): {
  backupDir: string
  copied: Array<{ rel: string; abs: string; backupAbs: string }>
} {
  const workDir = join(projectRoot, BOUNDARY_DIR, 'works', workName)
  const backupDir = join(workDir, '.migrated-v0')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  const copied: Array<{ rel: string; abs: string; backupAbs: string }> = []
  for (const f of files) {
    const backupAbs = join(backupDir, f.rel)
    const backupDirParent = join(backupAbs, '..')
    if (!existsSync(backupDirParent)) {
      mkdirSync(backupDirParent, { recursive: true })
    }
    try {
      const content = readFileSync(f.abs)
      // 用 readFileSync（不带 encoding）保留二进制安全（jsonl 含 utf-8 字节）
      writeFileSync(backupAbs, content)
      copied.push({ rel: f.rel, abs: f.abs, backupAbs })
    } catch {
      // 备份失败：留原文件不动
    }
  }
  return { backupDir, copied }
}

// ───────── 顶层入口 ─────────

/** PR-14d: 软警告（域/蓝图 ref 解析失败等）— 不入 IAPError 字典 */
type InvalidRef = {
  code: string
  severity: 'warn'
  ref: string
  type: 'domain' | 'blueprint'
  message: string
  suggestion: string
}

export type MigrateResult =
  | {
      ok: true
      kind: 'migrated' | 'already-v1'
      workName: string
      v0FilesMoved: number
      artifactsWritten: string[]
      backupDir?: string
      warnings: string[]
      /** PR-14d: 软警告（域/蓝图 ref 解析失败等）— 不入 IAPError 字典 */
      invalidRefs?: InvalidRef[]
    }
  | {
      ok: false
      kind: 'work-not-found' | 'no-v0-layout' | 'partial-v0' | 'io-error'
      message: string
      warnings: string[]
    }

/**
 * v1.1 fix-p3-refactor migrator-decompose: 从 V0 备份恢复 V1 文件。
 * 删 V0 原文件, 从 .migrated-v0/ 读内容写到 .run/ 对应 V1 路径.
 */
function restoreV0ToV1Paths(
  projectRoot: string,
  workName: string,
  copied: Array<{ rel: string; abs: string; backupAbs: string }>,
  warnings: string[],
): void {
  for (const m of copied) {
    const restoredAbs = computeV1Path(projectRoot, workName, m.rel)
    if (!restoredAbs) continue
    const restoredDir = join(restoredAbs, '..')
    if (!existsSync(restoredDir)) {
      mkdirSync(restoredDir, { recursive: true })
    }
    try {
      const content = readFileSync(m.backupAbs)
      writeFileSync(restoredAbs, content)
    } catch {
      warnings.push(`failed to restore ${m.rel} to V1 path`)
    }
  }
}

/**
 * v1.1 fix-p3-refactor migrator-decompose: 重新生成 V1 产物
 *   - per-work slim 索引 (domains.json + blueprints.json)
 *   - .work 出生证明 (planLock=null, assets 重算)
 * 返回 invalidRefs 软警告 (PR-14d).
 */
async function regenerateV1Artifacts(
  projectRoot: string,
  workName: string,
  workMdPath: string,
): Promise<{
  artifactsWritten: string[]
  invalidRefs: InvalidRef[]
}> {
  const workDir = join(projectRoot, BOUNDARY_DIR, 'works', workName)
  const workContent = readFileSync(workMdPath, 'utf-8')
  const artifactsWritten: string[] = []
  const invalidRefs: InvalidRef[] = []

  // 🆕 v0.6.1-alpha.4 Phase B: 删除 domainsIdx + domainsJsonPath 相关调用
  // （Domain 引用走 Blueprint ## Refs 路径，由 per-work-blueprints-merger 统一处理）
  const blueprintsIdx = buildPerWorkBlueprintsIndex({ projectRoot, workName, workMdPath })
  const blueprintsJsonPath = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  writePerWorkBlueprintsIndex({ projectRoot, workName, workMdPath, outPath: blueprintsJsonPath })
  artifactsWritten.push(blueprintsJsonPath)

  // 解析 work.md context
  const goalMatch = workContent.match(/goal\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const goal = goalMatch?.[1]?.replace(/\\"/g, '"') ?? ''
  const constraintsMatch = workContent.match(/constraints\s*=\s*\[([^\]]*)\]/)
  const constraints: string[] = constraintsMatch
    ? Array.from(constraintsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
    : []
  const maxItersMatch = workContent.match(/max_iterations\s*=\s*(\d+)/)
  const maxIterations = maxItersMatch ? Number.parseInt(maxItersMatch[1]!, 10) : 3

  // 🆕 v0.6.1-alpha.4 Phase B: 删除 domains invalid ref 收集（Domain 引用走 Blueprint ## Refs 路径）
  for (const b of blueprintsIdx.blueprints) {
    if (b.status === 'invalid') {
      const ref = b.ref ?? b.name
      const reason = ref.startsWith('@oxn/')
        ? '@oxn/ scope has no builtin blueprint registry (V1)'
        : (b.errors[0] ?? 'blueprint file not found')
      invalidRefs.push({
        code: 'OXN_WORK_REFS_UNRESOLVED',
        severity: 'warn',
        ref,
        type: 'blueprint',
        message: `Blueprint '${b.name}' declared but unresolved during migrate: ${reason}`,
        suggestion: `Check blueprint name spelling, or run \`oxn blueprint create ${b.name}\``,
      })
    }
  }

  // 🆕 v0.6.1-alpha.4 Phase B: 删 domainAssets 构造（Domain 引用走 Blueprint ## Refs）
  const blueprintAssets = blueprintsIdx.blueprints
    .filter((b) => b.status === 'ok')
    .map((b) => ({
      name: b.name,
      version: b.version,
      fileHash: hashFile(join(projectRoot, b.file)) ?? '',
    }))

  const cert: BirthCert = createBirthCert({
    workName,
    goal,
    constraints,
    maxIterations,
    assets: { blueprints: blueprintAssets }, // 🆕 Phase B: 删 domains 字段
  })
  writeWorkFile(projectRoot, workName, cert)
  artifactsWritten.push(join(workDir, WORK_FILE))

  return { artifactsWritten, invalidRefs }
}

export async function migrateWorkToV1(projectRoot: string, workName: string): Promise<MigrateResult> {
  const workDir = join(projectRoot, BOUNDARY_DIR, 'works', workName)
  const workMdPath = join(workDir, 'work.md')

  // ── 1. work.md 必须存在 ──
  if (!existsSync(workMdPath)) {
    return {
      ok: false,
      kind: 'work-not-found',
      message: `work.md not found at ${workMdPath}`,
      warnings: [],
    }
  }

  // ── 2. 探测 V0 旧布局 ──
  const probe = probeV0Layout(projectRoot, workName)
  if (probe.hasV1Artifacts) {
    return {
      ok: true,
      kind: 'already-v1',
      workName,
      v0FilesMoved: 0,
      artifactsWritten: [],
      warnings: [
        `work "${workName}" already has V1 artifacts (.run/state.json exists); ` +
          'migrate is a no-op. Clean up stale V0 files manually if any.',
      ],
    }
  }
  if (!probe.hasAnyV0File) {
    return {
      ok: false,
      kind: 'no-v0-layout',
      message:
        `work "${workName}" has no V0 runtime files (work-state.json / work-trace.jsonl / work-frozen.json). ` +
        'This is a planning-only work; nothing to migrate. Run `oxn work validate` + `lock` to start execution.',
      warnings: [],
    }
  }

  const warnings: string[] = []
  if (probe.missingV0Files.length > 0) {
    warnings.push(
      `partial V0: ${probe.missingV0Files.length} file(s) declared in tasks/<t>/ but missing on disk: ` +
        probe.missingV0Files.join(', '),
    )
  }

  // ── 3. 备份 V0 → 删 V0 原文件 ──
  let backupDir: string
  let copied: Array<{ rel: string; abs: string; backupAbs: string }>
  try {
    const result = copyV0ToBackup(projectRoot, workName, probe.v0Files)
    backupDir = result.backupDir
    copied = result.copied
  } catch (err) {
    return {
      ok: false,
      kind: 'io-error',
      message: `failed to backup V0 files: ${err instanceof Error ? err.message : String(err)}`,
      warnings,
    }
  }
  for (const m of copied) {
    try {
      unlinkSync(m.abs)
    } catch {
      warnings.push(`failed to remove V0 file ${m.rel}`)
    }
  }

  // ── 4. 在新位置重建 V1 文件 ──
  restoreV0ToV1Paths(projectRoot, workName, copied, warnings)

  let artifactsWritten: string[] = []
  let invalidRefs: InvalidRef[] = []
  try {
    const r = await regenerateV1Artifacts(projectRoot, workName, workMdPath)
    artifactsWritten = r.artifactsWritten
    invalidRefs = r.invalidRefs
  } catch (err) {
    warnings.push(`failed to regenerate .work: ${err instanceof Error ? err.message : String(err)}`)
  }

  return {
    ok: true,
    kind: 'migrated',
    workName,
    v0FilesMoved: copied.length,
    artifactsWritten,
    backupDir,
    warnings,
    invalidRefs,
  }
}

// ───────── V0 → V1 路径映射 ─────────

/**
 * 把 V0 旧 rel 路径映射到 V1 新绝对路径。
 * 例：
 *   work-state.json                  → <workDir>/.run/state.json
 *   work-trace.jsonl                 → <workDir>/.run/trace.jsonl
 *   work-frozen.json                 → <workDir>/.run/frozen.json
 *   tasks/<t>/task-state.json        → <workDir>/.run/tasks/<t>/state.json
 *   tasks/<t>/task-trace.jsonl       → <workDir>/.run/tasks/<t>/trace.jsonl
 *   tasks/<t>/task-frozen.json       → <workDir>/.run/tasks/<t>/frozen.json
 */
function computeV1Path(projectRoot: string, workName: string, v0Rel: string): string | null {
  const workDir = join(projectRoot, BOUNDARY_DIR, 'works', workName)
  const runDir = join(workDir, RUN_DIR)
  const tasksRunDir = join(runDir, RUN_TASKS_SUBDIR)

  if (v0Rel === V0_WORK_STATE) return join(runDir, 'state.json')
  if (v0Rel === V0_WORK_TRACE) return join(runDir, 'trace.jsonl')
  if (v0Rel === V0_WORK_FROZEN) return join(runDir, 'frozen.json')

  if (v0Rel.startsWith('tasks/')) {
    const rest = v0Rel.slice('tasks/'.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx === -1) return null
    const taskName = rest.slice(0, slashIdx)
    const fileName = rest.slice(slashIdx + 1)
    if (fileName === V0_TASK_STATE) return join(tasksRunDir, taskName, 'state.json')
    if (fileName === V0_TASK_TRACE) return join(tasksRunDir, taskName, 'trace.jsonl')
    if (fileName === V0_TASK_FROZEN) return join(tasksRunDir, taskName, 'frozen.json')
  }
  return null
}
