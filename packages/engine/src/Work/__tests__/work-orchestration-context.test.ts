/**
 * work-orchestration-context.test.ts — v0.7 follow-up
 *
 * 验证 WorkOrchestrationContext.oxn 的 term/ban/invariant 与实际 CLI 行为一致
 * (v0.7+：Work 单一 Blueprint-driven 流程，无 mode；Asset Short Circuit 由 --asset-kind 触发)
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

describe('WorkOrchestrationContext.oxn 业务词汇验证 (v0.7+ Blueprint-driven)', () => {
  test('1. domain 描述 Blueprint 驱动的单一 Work 流程', () => {
    const content = readDomain()
    expect(content).toContain('BlueprintDrivenOrchestration')
    expect(content).toContain('Blueprint slots')
  })

  test('2. domain AssetShortCircuit 由 --asset-kind 触发（不再依赖 --type）', () => {
    const content = readDomain()
    expect(content).toContain('AssetShortCircuit')
    expect(content).toContain('--asset-kind')
    expect(content).toContain('handleAssetModeCreate')
    // 不再出现 workTypeToMode
    expect(content).not.toContain('workTypeToMode')
  })

  test('3. domain 含 6 个 AssetKind 字符串 (domain/blueprint/stack/roadmap/library/external)', () => {
    const content = readDomain()
    expect(content).toContain('domain')
    expect(content).toContain('blueprint')
    expect(content).toContain('stack')
    expect(content).toContain('roadmap')
    expect(content).toContain('library')
    expect(content).toContain('external')
  })

  test('4. domain ban 列表禁 mode/workType 一切历史概念', () => {
    const content = readDomain()
    const banBlock = content.match(/ban\s*\{([\s\S]*?)\}\s*;?/m)
    expect(banBlock).not.toBeNull()
    const ban = banBlock![1] ?? ''
    // 新增 v0.7 禁用
    expect(ban).toContain('WorkMode')
    expect(ban).toContain('WorkType')
    expect(ban).toContain('WorkTypeFallback')
    expect(ban).toContain('workTypeToMode')
    expect(ban).toContain('WorkModeSchema')
    expect(ban).toContain('EditTarget')
    // 历史禁用
    expect(ban).toContain('WorkTypeDevelop')
    expect(ban).toContain('WorkTypeFix')
    expect(ban).toContain('WorkTypeOnboarding')
  })

  test('5. domain invariant 明确说 Work 无 mode（CLI 不接受 --type）', () => {
    const content = readDomain()
    expect(content).toContain('Work 不再有 mode')
    expect(content).toContain('Blueprint 承载')
    expect(content).toContain('--type')
    expect(content).toContain('-t')
  })

  test('6. domain invariant 列出 create 的 3 个互斥路径', () => {
    const content = readDomain()
    expect(content).toContain('oxn work create 仅有 3 个互斥路径')
    expect(content).toContain('Asset Short Circuit')
    expect(content).toContain('handleAssetModeCreate')
  })

  test('7. domain 保留 PlanLock 4 组件 hash 守卫 (workOxn/workDomains/blueprints/tasks)', () => {
    const content = readDomain()
    expect(content).toContain('workOxnHash')
    expect(content).toContain('workDomainsHash')
    expect(content).toContain('blueprintsHash')
    expect(content).toContain('tasksHash')
    expect(content).toContain('IAP_ALIGN_LOCK_HASH_MISMATCH')
  })

  test('8. domain 保留 8 阶段流程 (init/migrate/create/add-task/validate/lock/run/submit)', () => {
    const content = readDomain()
    const phases = ['init', 'migrate', 'create', 'add-task', 'validate', 'lock', 'run', 'submit']
    for (const p of phases) {
      expect(content).toContain(p)
    }
  })

  test('9. domain BirthCert 不再含 mode/editTarget', () => {
    const content = readDomain()
    const birthCertTerm = content.match(/"BirthCert":\s*"([^"]+)"/)
    expect(birthCertTerm).not.toBeNull()
    const desc = birthCertTerm![1] ?? ''
    expect(desc).toContain('v0.7 移除 mode + editTarget 字段')
    expect(desc).not.toContain('mode 字段')
  })
})
