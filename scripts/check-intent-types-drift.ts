#!/usr/bin/env bun
/**
 * scripts/check-intent-types-drift.ts
 *
 * version: 0.7.5
 * synced-at: 2026-08-09
 *
 * v0.3 改革 PR-C（feat/v0.3-t20-md-native-highlight）
 *
 * 角色：
 * - 检测 L1-OXL（src/oxl/md-bridge/intent-entity-types.json）vs
 *   L3-CLI（oxn-vscode/intent-entity-types.json）的 IntentEntityType 白名单是否漂移
 * - oxn-vscode 物理隔离 L1-OXL：禁止 import；用本脚本做 CI 守卫
 *
 * 使用：
 *   bun scripts/check-intent-types-drift.ts
 *
 * 退出码：
 *   0 - 0 漂移
 *   1 - 有漂移
 *
 * 漂移定义：L1 / L3 两份 JSON 数组排序后内容不一致
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = process.cwd()
const L1_TYPES_PATH = join(PROJECT_ROOT, 'src/oxl/md-bridge/intent-entity-types.json')
const L3_TYPES_PATH = join(PROJECT_ROOT, 'oxn-vscode/intent-entity-types.json')

interface DriftResult {
  l1Types: string[]
  l3Types: string[]
  drift: {
    missingInL3: string[]
    missingInL1: string[]
  }
}

function loadTypes(path: string): string[] {
  if (!existsSync(path)) {
    console.warn(`⚠️  Not found: ${path}`)
    return []
  }
  const content = readFileSync(path, 'utf-8').trim()
  if (!content) return []
  try {
    const parsed = JSON.parse(content) as string[]
    if (!Array.isArray(parsed)) {
      throw new Error('JSON is not an array')
    }
    return parsed.sort()
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function detectDrift(): DriftResult {
  const l1Types = loadTypes(L1_TYPES_PATH)
  const l3Types = loadTypes(L3_TYPES_PATH)

  const l1Set = new Set(l1Types)
  const l3Set = new Set(l3Types)

  const missingInL3: string[] = []
  const missingInL1: string[] = []

  for (const t of l1Set) {
    if (!l3Set.has(t)) missingInL3.push(t)
  }
  for (const t of l3Set) {
    if (!l1Set.has(t)) missingInL1.push(t)
  }

  return {
    l1Types,
    l3Types,
    drift: { missingInL3, missingInL1 },
  }
}

function main() {
  console.log('🔍 v0.3 改革 PR-C：IntentEntityType 白名单 drift 检查')
  console.log(`   L1: ${L1_TYPES_PATH}`)
  console.log(`   L3: ${L3_TYPES_PATH}`)
  console.log('')

  let result: DriftResult
  try {
    result = detectDrift()
  } catch (err) {
    console.error('❌ Drift check failed:')
    console.error(`   ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  console.log(`📋 L1 types: [${result.l1Types.join(', ')}]`)
  console.log(`📋 L3 types: [${result.l3Types.join(', ')}]`)
  console.log('')

  if (result.drift.missingInL3.length === 0 && result.drift.missingInL1.length === 0) {
    console.log('✅ OK: L1 / L3 IntentEntityType 白名单一致（0 漂移）')
    process.exit(0)
  }

  console.error('❌ Drift detected:')
  if (result.drift.missingInL3.length > 0) {
    console.error(`   Missing in L3: [${result.drift.missingInL3.join(', ')}]`)
  }
  if (result.drift.missingInL1.length > 0) {
    console.error(`   Missing in L1: [${result.drift.missingInL1.join(', ')}]`)
  }
  console.error('')
  console.error('💡 Fix:')
  console.error('   1. 在 src/oxl/md-bridge/intent-entity-types.json 添加缺失项')
  console.error('   2. 在 oxn-vscode/intent-entity-types.json 添加缺失项')
  console.error('   3. 重新跑本脚本')

  process.exit(1)
}

main()
