/**
 * work-orchestration-context.test.ts — v0.6.1-alpha.1 follow-up
 *
 * 验证 WorkOrchestrationContext.oxn 的 term/ban/invariant 与实际 CLI 行为一致
 * (5 workType: task/explore/edit/workspace/asset, 3 一等 mode, workTypeToMode 兜底映射)
 */

import { describe, test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// __tests__ → Work → src → engine → packages → repo root → .openxenon/...
const DOMAIN_PATH = resolve(
  import.meta.dir,
  '..',
  '..',
  '..',
  '..',
  '..',
  '.openxenon',
  'assets',
  'domains',
  'WorkOrchestrationContext.oxn',
)

function readDomain(): string {
  return readFileSync(DOMAIN_PATH, 'utf-8')
}

describe('WorkOrchestrationContext.oxn 业务词汇验证 (5 workType + 3 mode 范式)', () => {
  test('1. domain 含 5 个 workType 字符串: task / explore / edit / workspace / asset', () => {
    const content = readDomain()
    // 一等 mode 3
    expect(content).toContain('task')
    expect(content).toContain('explore')
    expect(content).toContain('edit')
    // 扩展/独立 2
    expect(content).toContain('workspace')
    expect(content).toContain('asset')
  })

  test('2. domain WorkType term 显式列 5 个 workType 字符串', () => {
    const content = readDomain()
    // WorkType term 应当描述 5 个
    const workTypeTerm = content.match(/"WorkType":\s*"([^"]+)"/)
    expect(workTypeTerm).not.toBeNull()
    const desc = workTypeTerm![1] ?? ''
    expect(desc).toContain('task')
    expect(desc).toContain('explore')
    expect(desc).toContain('edit')
    expect(desc).toContain('workspace')
    expect(desc).toContain('asset')
  })

  test('3. domain 含 3 个一等 mode 枚举 (task/explore/edit)', () => {
    const content = readDomain()
    // 应当提到 z.enum 3 选 1
    expect(content).toContain('WorkModeSchema')
    // 3 个一等 mode 显式列出
    expect(content).toContain('"WorkMode"')
    const workModeTerm = content.match(/"WorkMode":\s*"([^"]+)"/)
    expect(workModeTerm).not.toBeNull()
    const desc = workModeTerm![1] ?? ''
    expect(desc).toContain('task')
    expect(desc).toContain('explore')
    expect(desc).toContain('edit')
  })

  test('4. domain 提到 workTypeToMode 兑底映射 (workspace + 未知 -> task+warning)', () => {
    const content = readDomain()
    expect(content).toContain('workTypeToMode')
    // 兑底 warning 模板
    expect(content).toContain('fallback to task')
    // unknown workType 识别
    expect(content).toContain('unknown workType')
  })

  test('5. domain 描述 AssetModeShortCircuit 走独立 handleAssetModeCreate 路径', () => {
    const content = readDomain()
    expect(content).toContain('AssetModeShortCircuit')
    expect(content).toContain('handleAssetModeCreate')
    // 不调 workTypeToMode
    const shortCircuitTerm = content.match(/"AssetModeShortCircuit":\s*"([^"]+)"/)
    expect(shortCircuitTerm).not.toBeNull()
    const desc = shortCircuitTerm![1] ?? ''
    expect(desc).toContain('不调 workTypeToMode')
    expect(desc).toContain('--asset-kind')
  })

  test('6. domain 提到 5 个 AssetKind 字符串 (domain/blueprint/stack/library/external)', () => {
    const content = readDomain()
    expect(content).toContain('domain')
    expect(content).toContain('blueprint')
    expect(content).toContain('stack')
    expect(content).toContain('library')
    expect(content).toContain('external')
  })

  test('7. domain ban 列表禁 3 个错名 workType (WorkTypeDevelop/Fix/Onboarding)', () => {
    const content = readDomain()
    const banBlock = content.match(/ban\s*\{([\s\S]*?)\}\s*;?/m)
    expect(banBlock).not.toBeNull()
    const ban = banBlock![1] ?? ''
    expect(ban).toContain('WorkTypeDevelop')
    expect(ban).toContain('WorkTypeFix')
    expect(ban).toContain('WorkTypeOnboarding')
  })

  test('8. domain invariant 明确说 5 workType 范式 (不是 4 子模式)', () => {
    const content = readDomain()
    // 新 invariant 段
    expect(content).toContain('5 个 workType 字符串')
    // 旧错名 invariant 段不应当出现
    expect(content).not.toContain('4 个子模式')
  })

  test('9. domain invariant 提到 workTypeToMode 只识别 3 一等 + 兑底 warning', () => {
    const content = readDomain()
    expect(content).toContain('workTypeToMode 只识别 3 个一等')
    expect(content).toContain('fallback to task')
    expect(content).toContain('unknown workType')
    // 3 个一等显式在 invariant 段
    const allInvariants = content.match(/invariant\s*\{([\s\S]*?)\}\s*\n\n\}/m)
    expect(allInvariants).not.toBeNull()
    const inv = allInvariants![1] ?? ''
    expect(inv).toContain('task')
    expect(inv).toContain('explore')
    expect(inv).toContain('edit')
  })

  test('10. domain 保留 PlanLock 4 组件 hash 守卫 (workOxn/workDomains/blueprints/tasks)', () => {
    const content = readDomain()
    expect(content).toContain('workOxnHash')
    expect(content).toContain('workDomainsHash')
    expect(content).toContain('blueprintsHash')
    expect(content).toContain('tasksHash')
    expect(content).toContain('IAP_ALIGN_LOCK_HASH_MISMATCH')
  })

  test('11. domain 保留 8 阶段流程 (init/migrate/create/add-task/validate/lock/run/submit)', () => {
    const content = readDomain()
    const phases = ['init', 'migrate', 'create', 'add-task', 'validate', 'lock', 'run', 'submit']
    for (const p of phases) {
      expect(content).toContain(p)
    }
  })
})
