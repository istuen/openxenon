#!/usr/bin/env bun
/**
 * scripts/check-md-fallback-stats.ts — v0.6.1 PR-3 CI 守卫（INFO 等级）
 *
 * 扫描 .openxenon 下的 .oxn fallback 文件数量 → 打印 INFO 日志（非 blocker）。
 *
 * 设计动机（D-α c 锁定）：
 *   - v0.6.1 不删 .oxn，保留作 v0.6.x fallback
 *   - v0.7.0 切割时一次性 `git rm` 全部 .oxn
 *   - 本脚本为观察期工具，让维护者看到 .oxn 数量随 .md 迁移逐步下降的趋势
 *
 * 不变量：
 *   - 退出码 0（INFO 不阻断 CI）
 *   - 输出格式：`<kind>: <count> .oxn fallback files remaining`
 *   - 总数同步输出 + 趋势建议
 *
 * 使用：
 *   bun scripts/check-md-fallback-stats.ts
 */

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = process.cwd()
const BOUNDARY_DIR = '.openxenon'

/** v0.6.1 AssetKind 6 类对应的目录名 */
const KIND_DIRS: Array<{ kind: string; dir: string }> = [
  { kind: 'domain', dir: 'domains' },
  { kind: 'blueprint', dir: 'blueprints' },
  { kind: 'stack', dir: 'stack' },
  { kind: 'roadmap', dir: 'roadmaps' },
  { kind: 'library', dir: 'libraries' },
  { kind: 'external', dir: 'externals' },
]

interface KindStat {
  kind: string
  oxnCount: number
  mdCount: number
}

function countByExt(dir: string): { oxn: number; md: number } {
  let oxn = 0
  let md = 0
  try {
    const stat = statSync(dir, { throwIfNoEntry: false })
    if (!stat || !stat.isDirectory()) return { oxn, md }
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.oxn')) oxn++
      else if (f.endsWith('.md')) md++
    }
  } catch {
    // ignore
  }
  return { oxn, md }
}

function main() {
  const stats: KindStat[] = []
  let totalOxn = 0
  let totalMd = 0

  // 主路径：.openxenon/assets/<kind>/
  const assetsRoot = join(PROJECT_ROOT, BOUNDARY_DIR, 'assets')
  for (const { kind, dir } of KIND_DIRS) {
    const fullDir = join(assetsRoot, dir)
    const { oxn, md } = countByExt(fullDir)
    if (oxn > 0 || md > 0) {
      stats.push({ kind, oxnCount: oxn, mdCount: md })
      totalOxn += oxn
      totalMd += md
    }
  }

  // Fallback 路径：.openxenon/<kind>/ (v0.5 旧布局)
  for (const { kind, dir } of KIND_DIRS) {
    const fallbackDir = join(PROJECT_ROOT, BOUNDARY_DIR, dir)
    const { oxn, md } = countByExt(fallbackDir)
    if (oxn > 0 || md > 0) {
      // 检查是否已经计入主路径
      const existing = stats.find((s) => s.kind === kind)
      if (existing) {
        existing.oxnCount += oxn
        existing.mdCount += md
      } else {
        stats.push({ kind, oxnCount: oxn, mdCount: md })
      }
      totalOxn += oxn
      totalMd += md
    }
  }

  console.log('=== v0.6.1 PR-3 .oxn fallback stats (INFO) ===')
  for (const s of stats) {
    const ratio = s.mdCount > 0 ? (s.oxnCount / (s.oxnCount + s.mdCount) * 100).toFixed(1) : '0.0'
    console.log(`  ${s.kind.padEnd(10)} : ${String(s.oxnCount).padStart(3)} .oxn / ${String(s.mdCount).padStart(3)} .md  (${ratio}% legacy remaining)`)
  }
  console.log('  ' + '-'.repeat(60))
  console.log(`  ${'TOTAL'.padEnd(10)} : ${String(totalOxn).padStart(3)} .oxn / ${String(totalMd).padStart(3)} .md`)
  console.log('')

  if (totalOxn === 0) {
    console.log('✓ Clean: no .oxn fallback files remain. v0.7.0 can proceed with git rm.')
  } else if (totalMd === 0) {
    console.log('⚠ Warning: only .oxn files present. Run `oxn domain sync --all` and `oxn blueprint sync --all` to migrate.')
  } else {
    const ratio = (totalMd / (totalOxn + totalMd)) * 100
    console.log(`ℹ Migration progress: ${ratio.toFixed(1)}% converted to .md. v0.7.0 cutover planned.`)
  }

  // INFO 级 — 不阻断 CI
  process.exit(0)
}

main()
