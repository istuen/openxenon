/**
 * cli/commands/external.ts — `oxn external` 命令族（v0.6.1-alpha.4 Phase 2）
 *
 * 子命令：
 *   - check   扫描所有边界类型文件（domain/workflow/stack）中的 ## Externals 声明，
 *             检查每个 external 的 url/path 可达性，更新 .openxenon/.cache/external-status.json
 *   - status  显示所有 external 的当前 status
 *   - mark    手动设置某条 external 的 status
 */

import { readFile, readdirSync, fileExists } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { defineCommand } from 'citty'
import { output, outputError } from './output.js'
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import {
  setStatus,
  loadStatusFile,
  checkExternalReachable,
  isTtlExpired,
  externalStatusKey,
} from '@openxenon/engine/Asset/external-status'

function getProjectRoot(): string {
  return process.cwd()
}

interface ParsedExternal {
  entityType: 'domain' | 'workflow' | 'stack'
  entityName: string
  externalName: string
  url?: string
  path?: string
  ttl?: string
}

/**
 * 扫描 .openxenon/assets/{domains,workflows,stack}/*.md
 * 提取所有 ## Externals 声明。
 */
function scanAllExternals(projectRoot: string): ParsedExternal[] {
  const out: ParsedExternal[] = []
  const dirs: Array<{ type: 'domain' | 'workflow' | 'stack'; dir: string }> = [
    { type: 'domain', dir: resolveAssetDir(projectRoot, 'domain', null) },
    { type: 'workflow', dir: resolveAssetDir(projectRoot, 'workflow', null) },
    { type: 'stack', dir: resolveAssetDir(projectRoot, 'stack', null) },
  ]

  for (const { type, dir } of dirs) {
    if (!fileExists(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const content = readFile(join(dir, file)) ?? ''
      const entityName = file.replace(/\.md$/, '')
      // 找 ## Externals section（使用 indexOf 切片 + matchAll 替代 lookahead 在 EOF 处失效）
      const marker = '## Externals'
      const idx = content.indexOf(`${marker}\n`)
      if (idx === -1) continue
      const after = content.slice(idx + marker.length + 1)
      // 到下一个 ## 之前结束
      const end = after.search(/\n##\s/)
      const sectionBody = end === -1 ? after : after.slice(0, end)
      // 提取每个 ### name
      const h3Matches = sectionBody.matchAll(/###\s+([^\n]+)\n((?:\s*-\s*[^\n]+\n?)+)/g)
      for (const m of h3Matches) {
        const externalName = m[1]!.trim()
        const fieldBlock = m[2]!
        const url = fieldBlock.match(/-\s*url:\s*(\S+)/)?.[1]
        const path = fieldBlock.match(/-\s*path:\s*(\S+)/)?.[1]
        const ttl = fieldBlock.match(/-\s*ttl:\s*(\S+)/)?.[1]
        out.push({ entityType: type, entityName, externalName, url, path, ttl })
      }
    }
  }
  return out
}

export const externalCommand = defineCommand({
  meta: {
    name: 'external',
    description: 'Manage External inline declarations (status check/mark for domain/workflow/stack boundaries)',
  },
  subCommands: {
    check: defineCommand({
      meta: { name: 'check', description: 'Scan all boundary files and check External reachability' },
      args: {
        name: { type: 'string', description: 'Optional: only check this external name' },
        json: { type: 'boolean', default: false },
      },
      async run({ args }) {
        const projectRoot = getProjectRoot()
        const all = scanAllExternals(projectRoot)
        const nameFilter = typeof args.name === 'string' ? args.name : null
        const filtered = nameFilter ? all.filter((e) => e.externalName === nameFilter) : all

        const results: Array<{
          key: string
          entityType: string
          entityName: string
          externalName: string
          url?: string
          path?: string
          status: string
          error?: string
        }> = []

        for (const ext of filtered) {
          const previous = loadStatusFile(projectRoot)
          const key = externalStatusKey(ext.entityType, ext.entityName, ext.externalName)
          const prevRecord = previous[key]

          // TTL check first
          if (prevRecord && isTtlExpired(ext.ttl, prevRecord.lastChecked)) {
            setStatus(projectRoot, ext.entityType, ext.entityName, ext.externalName, 'stale')
            results.push({ key, ...ext, status: 'stale', error: `TTL expired: ${ext.ttl}` })
            continue
          }

          // Reachability check
          const reachable = await checkExternalReachable(ext)
          const status = reachable.ok ? 'available' : 'unavailable'
          setStatus(projectRoot, ext.entityType, ext.entityName, ext.externalName, status, reachable.error)
          results.push({
            key,
            entityType: ext.entityType,
            entityName: ext.entityName,
            externalName: ext.externalName,
            url: ext.url,
            path: ext.path,
            status,
            error: reachable.error,
          })
        }

        const summary = {
          total: results.length,
          available: results.filter((r) => r.status === 'available').length,
          unavailable: results.filter((r) => r.status === 'unavailable').length,
          stale: results.filter((r) => r.status === 'stale').length,
          results,
        }
        const format = args.json ? 'json' : 'human'
        if (format === 'json') {
          output({ data: summary, ok: true }, format)
        } else {
          const lines = [
            `Scanned ${summary.total} externals:`,
            `  available:   ${summary.available}`,
            `  unavailable: ${summary.unavailable}`,
            `  stale:       ${summary.stale}`,
            '',
            ...summary.results.map(
              (r) =>
                `  [${r.status.padEnd(11)}] ${r.entityType}::${r.entityName}::${r.externalName}${r.error ? ` — ${r.error}` : ''}`,
            ),
          ]
          console.log(lines.join('\n'))
        }
      },
    }),

    status: defineCommand({
      meta: { name: 'status', description: 'Show current External status from .openxenon/.cache/external-status.json' },
      args: {
        json: { type: 'boolean', default: false },
      },
      run({ args }) {
        const projectRoot = getProjectRoot()
        const data = loadStatusFile(projectRoot)
        const entries = Object.entries(data).map(([key, rec]) => ({ key, ...rec }))
        const format = args.json ? 'json' : 'human'
        if (format === 'json') {
          output({ data: { count: entries.length, entries }, ok: true }, format)
        } else {
          console.log(`External status (${entries.length} entries):`)
          for (const e of entries) {
            console.log(
              `  [${e.status.padEnd(11)}] ${e.key} (lastChecked: ${e.lastChecked}${e.error ? `, error: ${e.error}` : ''})`,
            )
          }
        }
      },
    }),

    mark: defineCommand({
      meta: { name: 'mark', description: 'Manually mark an External status (without reachability check)' },
      args: {
        name: { type: 'string', description: 'External name to mark', required: true },
        status: { type: 'string', description: 'New status (available/unavailable/stale/unknown)', required: true },
        reason: { type: 'string', description: 'Optional reason/note' },
        json: { type: 'boolean', default: false },
      },
      run({ args }) {
        const projectRoot = getProjectRoot()
        const status = (typeof args.status === 'string' ? args.status : 'unknown') as
          | 'available'
          | 'unavailable'
          | 'stale'
          | 'unknown'
        const targetName = typeof args.name === 'string' ? args.name : ''
        const all = scanAllExternals(projectRoot)
        const matches = all.filter((e) => e.externalName === targetName)
        if (matches.length === 0) {
          return outputError(
            {
              code: 'OXN_EXTERNAL_NOT_FOUND',
              message: `No external named '${targetName}' found in any boundary file`,
            },
            args.json ? 'json' : 'human',
          )
        }
        for (const m of matches) {
          setStatus(
            projectRoot,
            m.entityType,
            m.entityName,
            m.externalName,
            status,
            typeof args.reason === 'string' ? args.reason : undefined,
          )
        }
        const format = args.json ? 'json' : 'human'
        if (format === 'json') {
          output({ data: { marked: matches.length, matches }, ok: true }, format)
        } else {
          console.log(`Marked ${matches.length} external(s) as '${status}':`)
          for (const m of matches) {
            console.log(`  ${m.entityType}::${m.entityName}::${m.externalName}`)
          }
        }
      },
    }),
  },
})
