#!/usr/bin/env bun
/**
 * scripts/migrate-domains-to-native-md.ts
 *
 * v0.3 改革 PR-B 工具：把 14 个 .openxenon/domains/*.oxn 重新编译为新格式 .md
 * 用新的 EntityRegistry 路由（oxl-md-decompiler.ts 5 个 compiler 实现）
 *
 * 使用：
 *   bun scripts/migrate-domains-to-native-md.ts
 *
 * 输出：
 *   - .openxenon/domains-md/<name>.md  ←  字节级覆盖旧文件
 *   - .openxenon/domains-md/migration-stamp.json  ←  迁移审计记录
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'

interface MigrationRecord {
  source: string
  target: string
  bytesBefore: number
  bytesAfter: number
  contentHash: string
  migratedAt: string
}

const PROJECT_ROOT = process.cwd()
const DOMAINS_DIR = join(PROJECT_ROOT, '.openxenon/domains')
const DOMAINS_MD_DIR = join(PROJECT_ROOT, '.openxenon/domains-md')
const STAMP_FILE = join(DOMAINS_MD_DIR, 'migration-stamp.json')

async function migrateOne(oxnFilename: string): Promise<MigrationRecord | null> {
  const baseName = oxnFilename.replace(/\.oxn$/, '')
  const oxnPath = join(DOMAINS_DIR, oxnFilename)
  const mdPath = join(DOMAINS_MD_DIR, `${baseName}.md`)

  if (!existsSync(oxnPath)) {
    console.warn(`⚠️  Source not found: ${oxnPath}`)
    return null
  }

  const oxnContent = readFileSync(oxnPath, 'utf-8')
  const bytesBefore = existsSync(mdPath) ? readFileSync(mdPath).length : 0

  try {
    const result = await compileOxnToMd(oxnContent, {
      entity: 'domain',
      frontmatter: true,
    })
    writeFileSync(mdPath, result.md, 'utf-8')
    const bytesAfter = result.md.length

    return {
      source: oxnPath,
      target: mdPath,
      bytesBefore,
      bytesAfter,
      contentHash: result.contentHash,
      migratedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error(`❌ Failed: ${oxnFilename}`)
    console.error(`   ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function main() {
  console.log('🚀 v0.3 改革 PR-B：.oxn → .md 全量重新编译')
  console.log(`   source: ${DOMAINS_DIR}`)
  console.log(`   target: ${DOMAINS_MD_DIR}`)
  console.log('')

  const oxnFiles = readdirSync(DOMAINS_DIR).filter((f) => f.endsWith('.oxn')).sort()
  console.log(`📁 Found ${oxnFiles.length} .oxn files`)
  console.log('')

  const records: MigrationRecord[] = []
  for (const file of oxnFiles) {
    process.stdout.write(`  Migrating ${file} ... `)
    const record = await migrateOne(file)
    if (record) {
      const delta = record.bytesAfter - record.bytesBefore
      const sign = delta > 0 ? '+' : ''
      console.log(`✓ (${record.bytesBefore}B → ${record.bytesAfter}B, ${sign}${delta}B)`)
      records.push(record)
    } else {
      console.log('✗')
    }
  }

  writeFileSync(STAMP_FILE, JSON.stringify({
    migrationType: 'oxl-md-decompiler v0.3 PR-B',
    migratedAt: new Date().toISOString(),
    count: records.length,
    records,
  }, null, 2), 'utf-8')

  console.log('')
  console.log(`✅ ${records.length}/${oxnFiles.length} files migrated`)
  console.log(`📄 Audit stamp: ${STAMP_FILE}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
