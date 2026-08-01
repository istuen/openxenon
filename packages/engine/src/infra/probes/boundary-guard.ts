// =============================================================================
// boundary-guard probe (RFC-0015 D6.1)
//
// 验证每个 .openxenon/works/<name>/work.md 中:
//   1. ## Tasks 段下每个 task 的 - blueprint: 引用实际存在于 .openxenon/assets/blueprints/
//      或为 oxn-blueprint (内置 default)
//   2. - domain: 引用实际存在于 .openxenon/assets/domains/ 或为 @oxn/domains/<name> builtin
//   3. - boundary: 非空字符串 (work-validator.ts 必填)
//   4. deps[] 中每个 task name 在 ## Tasks 段下能找到
//
// 一等公民 verdict: 任何 work 的 task refs drift 即 fail, 强制工程师 review.
//
// L1-Infra: 读 .md 用 L1 filesystem 接口; 用 oxl/md-pipeline/utils collectHeadingContexts.
// =============================================================================

import { existsSync, readdirSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import {
  parseMarkdown,
  collectHeadingContexts,
  collectListFields,
  type ListField,
} from '@openxenon/engine/oxl/md-pipeline/utils'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface BoundaryGuardParams {
  /** 项目根（默认 process.cwd()） */
  root?: string
}

export interface BoundaryGuardResult {
  /** exit code 0 = 所有 work refs resolve */
  passed: boolean
  /** 总 work 数 */
  workCount: number
  /** 总 task 数 */
  taskCount: number
  /** drift 详情 */
  failedRefs: Array<{
    work: string
    task: string
    field: 'blueprint' | 'domain' | 'boundary' | 'dep'
    value: string
    reason: string
  }>
}

const WORK_DIR = '.openxenon/works'
const BLUEPRINTS_DIR = '.openxenon/assets/blueprints'
const DOMAINS_DIR = '.openxenon/assets/domains'
const OXN_BUILTIN_BLUEPRINT = 'oxn-blueprint'
const OXN_BUILTIN_DOMAINS = new Set<string>([
  'oxn-asset-domain',
  'oxn-cli-domain',
  'oxn-domain',
  'oxn-draft-domain',
  'oxn-engine-domain',
  'oxn-insight-domain',
  'oxn-project-domain',
  'oxn-proof-domain',
  'oxn-work-domain',
])

function listBuiltinBlueprints(projectRoot: string): Set<string> {
  const out = new Set<string>([OXN_BUILTIN_BLUEPRINT])
  const dir = join(projectRoot, BLUEPRINTS_DIR)
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.md')) out.add(f.replace(/\.md$/, ''))
  }
  return out
}

function listBuiltinDomains(projectRoot: string): Set<string> {
  const out = new Set<string>(OXN_BUILTIN_DOMAINS)
  const dir = join(projectRoot, DOMAINS_DIR)
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.md')) out.add(f.replace(/\.md$/, ''))
  }
  return out
}

export async function executeBoundaryGuard(
  params: BoundaryGuardParams,
  context: ProbeContext,
): Promise<BoundaryGuardResult> {
  const root = params.root ?? context.projectRoot
  const blueprints = listBuiltinBlueprints(root)
  const domains = listBuiltinDomains(root)

  const worksDir = join(root, WORK_DIR)
  if (!existsSync(worksDir)) {
    return { passed: true, workCount: 0, taskCount: 0, failedRefs: [] }
  }

  const result: BoundaryGuardResult = {
    passed: true,
    workCount: 0,
    taskCount: 0,
    failedRefs: [],
  }

  for (const workName of readdirSync(worksDir)) {
    const workFile = join(worksDir, workName, 'work.md')
    if (!existsSync(workFile)) continue
    result.workCount++

    const content = readFileSync(workFile, 'utf-8')
    const { tree } = parseMarkdown(content)
    const contexts = collectHeadingContexts(tree)

    // 找到 ## Tasks 段下的 H3 (## Tasks → ### <task-name>)
    const taskCtxs = contexts.filter((c) => c.h2 === 'Tasks')
    if (taskCtxs.length === 0) continue
    result.taskCount += taskCtxs.length

    const taskNames = taskCtxs.map((c) => c.h3).filter((n): n is string => Boolean(n))
    const taskNamesSet = new Set(taskNames)

    // 对每个 task 检查 blueprint/domain/boundary/deps
    for (const taskCtx of taskCtxs) {
      const taskName = taskCtx.h3
      if (!taskName) continue

      const fields = taskCtx.h3List ? collectListFields(taskCtx.h3List) : []

      const blueprint = getListScalar(fields, 'blueprint')
      if (blueprint && !blueprints.has(blueprint)) {
        result.failedRefs.push({
          work: workName,
          task: taskName,
          field: 'blueprint',
          value: blueprint,
          reason: `blueprint "${blueprint}" not in .openxenon/assets/blueprints/`,
        })
      }

      const domain = getListScalar(fields, 'domain')
      if (domain && !domains.has(domain)) {
        result.failedRefs.push({
          work: workName,
          task: taskName,
          field: 'domain',
          value: domain,
          reason: `domain "${domain}" not in .openxenon/assets/domains/`,
        })
      }

      const boundary = getListScalar(fields, 'boundary')
      if (!boundary || boundary.trim().length === 0) {
        result.failedRefs.push({
          work: workName,
          task: taskName,
          field: 'boundary',
          value: boundary ?? '',
          reason: 'boundary field missing or empty (work-validator requires it)',
        })
      }

      const deps = getListArray(fields, 'deps')
      for (const dep of deps) {
        if (!taskNamesSet.has(dep)) {
          result.failedRefs.push({
            work: workName,
            task: taskName,
            field: 'dep',
            value: dep,
            reason: `deps[] references "${dep}" but no ### <task-name> with that name found under ## Tasks`,
          })
        }
      }
    }
  }

  result.passed = result.failedRefs.length === 0
  return result
}

/** 从 ListField[] 提取 scalar（第一个匹配 key 的 value） */
function getListScalar(fields: ListField[], key: string): string | null {
  const found = fields.find((f) => f.key === key)
  if (!found) return null
  if (typeof found.value === 'string') return found.value
  if (typeof found.value === 'number' || typeof found.value === 'boolean') return String(found.value)
  return null
}

/** 从 ListField[] 提取 array。
 * 支持两种形式：
 *   1. 嵌套 list: collectListFields 返回 Array<String>
 *   2. bracket inline array: "deps: [a, b, c]" — 单字符串包含方括号数组
 */
function getListArray(fields: ListField[], key: string): string[] {
  const found = fields.find((f) => f.key === key)
  if (!found) return []
  if (Array.isArray(found.value)) {
    return found.value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof found.value === 'string') {
    // 尝试解析 "[a, b, c]" 格式
    const trimmed = found.value.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      return inner
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }
  }
  return []
}
