/**
 * `oxn assetmap` — scene-based AssetMap CLI (v0.7+)
 *
 * Subcommands:
 *   list         List all AssetMaps in the project
 *   show         Show AssetMap content (full or single scene)
 *   suggest      AI Agent entry: ranked matches by goal + scene
 *   sync         Detect dangling/outdated links (manual hint mode; dry-run default)
 *   validate     Alias to `oxn asset validate <name> --kind roadmap`
 *
 * Per user decisions:
 *   - --scene is REQUIRED for suggest (avoid full-AssetMap search)
 *   - Sync mode B (manual hint): Asset create prints hint but does not modify AssetMap
 *   - sync defaults to dry-run; --apply writes changes
 *
 * 🆕 v0.7 命名收敛：
 *   - CLI: `oxn assetmap`（用户面）
 *   - File: `assetmap.ts`（实现面）
 *   - AssetKind 枚举值仍为 `'roadmap'`（RFC-0013 D4 明确不改代码枚举）
 *   - 目录: `.openxenon/assets/assetmaps/`
 */

import { defineCommand } from 'citty'
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { parseRoadmapMd, suggestAssets, syncRoadmap } from '@openxenon/engine/Roadmap'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function listAssetmaps(): string[] {
  const root = join(getProjectRoot(), '.openxenon', 'assets', 'assetmaps')
  if (!existsSync(root)) return []
  const { readdirSync } = require('node:fs') as typeof import('node:fs')
  // List .md assetmaps
  const seen = new Set<string>()
  const out: string[] = []
  for (const f of readdirSync(root).filter((f: string) => f.endsWith('.md'))) {
    const name = f.replace(/\.md$/, '')
    if (!seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

function validateScene(roadmapName: string, sceneName: string): void {
  try {
    const { roadmap } = parseRoadmapMd(getProjectRoot(), roadmapName)
    if (!roadmap.scenes.find((s) => s.name === sceneName)) {
      const known = roadmap.scenes.map((s) => s.name).join(', ')
      outputUserInputError(
        'OXN_ASSETMAP_SCENE_NOT_FOUND',
        `Scene '${sceneName}' not found in AssetMap '${roadmapName}'. Known: ${known}`,
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('AssetMap not found')) {
      outputUserInputError('OXN_ASSETMAP_NOT_FOUND', err.message)
    }
    throw err
  }
}

export default defineCommand({
  meta: {
    name: 'assetmap',
    description: 'AssetMap navigation: scene-based routing for AI Agent + manual sync for Asset changes',
  },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'List all AssetMaps' },
      args: { json: { type: 'boolean' } },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const names = listAssetmaps()
        if (format === 'json') {
          return output({ ok: true, data: { assetmaps: names }, human: names.join('\n') || '(none)' }, format)
        }
        console.log(names.join('\n') || '(no AssetMaps)')
      },
    }),

    show: defineCommand({
      meta: { name: 'show', description: 'Show AssetMap content (full or single scene)' },
      args: {
        name: { type: 'positional', required: true, description: 'AssetMap name' },
        scene: { type: 'string', description: 'Filter to single scene' },
        json: { type: 'boolean' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const scene = ctx.args.scene as string | undefined
        try {
          const { roadmap } = parseRoadmapMd(getProjectRoot(), name)
          const scenes = scene ? roadmap.scenes.filter((s) => s.name === scene) : roadmap.scenes
          if (scene && scenes.length === 0) {
            validateScene(name, scene)
          }
          const data = { name: roadmap.name, version: roadmap.version, abstract: roadmap.abstract, scenes }
          if (format === 'json') {
            return output({ ok: true, data, human: JSON.stringify(data, null, 2) }, format)
          }
          // Human format
          console.log(`# AssetMap: ${data.name} (v${data.version})\n`)
          if (data.abstract) console.log(`> ${data.abstract}\n`)
          console.log(`Scenes: ${scenes.length}\n`)
          for (const s of scenes) {
            console.log(`### scene: ${s.name}`)
            console.log(`> ${s.description}`)
            console.log('')
            console.log('| kind | name | description |')
            console.log('|---|---|---|')
            for (const l of s.links) {
              console.log(`| ${l.kind} | ${l.name} | ${l.description} |`)
            }
            console.log('')
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('AssetMap not found')) {
            outputUserInputError('OXN_ASSETMAP_NOT_FOUND', msg)
          }
          outputError({ code: 'OXN_ASSETMAP_SHOW_FAILED', message: msg })
        }
      },
    }),

    suggest: defineCommand({
      meta: { name: 'suggest', description: 'AI Agent: ranked Asset matches by goal + scene' },
      args: {
        goal: { type: 'string', required: true, description: 'Goal description for matching' },
        scene: { type: 'string', required: true, description: 'Scene name (REQUIRED)' },
        roadmap: { type: 'string', default: 'oxn-system', description: 'AssetMap name (default: oxn-system)' },
        top: { type: 'string', default: '5', description: 'Top K results (default 5)' },
        json: { type: 'boolean' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const goal = ctx.args.goal as string
        const scene = ctx.args.scene as string
        const roadmapName = (ctx.args.roadmap as string) || 'oxn-system'
        const topStr = (ctx.args.top as string) || '5'
        try {
          const { roadmap } = parseRoadmapMd(getProjectRoot(), roadmapName)
          const topK = parseInt(topStr, 10) || 5
          const result = suggestAssets({ goal, roadmap, scene, topK })
          if (format === 'json') {
            return output({ ok: true, data: result, human: JSON.stringify(result, null, 2) }, format)
          }
          console.log(`Scene: ${result.scene}`)
          console.log('| kind | name | score | rationale |')
          console.log('|---|---|---|---|')
          for (const m of result.matches) {
            console.log(`| ${m.kind} | ${m.name} | ${m.score.toFixed(3)} | ${m.rationale} |`)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('--scene is required') || msg.includes('--goal is required')) {
            outputUserInputError('OXN_ASSETMAP_SUGGEST_BAD_INPUT', msg)
          }
          if (msg.includes("Scene '") && msg.includes("' not found")) {
            outputUserInputError('OXN_ASSETMAP_SCENE_NOT_FOUND', msg)
          }
          outputError({ code: 'OXN_ASSETMAP_SUGGEST_FAILED', message: msg })
        }
      },
    }),

    sync: defineCommand({
      meta: { name: 'sync', description: 'Detect dangling/outdated links (dry-run default; --apply writes)' },
      args: {
        name: { type: 'positional', required: true, description: 'AssetMap name' },
        scene: { type: 'string', description: 'Scope to single scene' },
        apply: { type: 'boolean', description: 'Apply changes (default: dry-run)' },
        json: { type: 'boolean' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const scene = ctx.args.scene as string | undefined
        const apply = ctx.args.apply === true
        try {
          const report = syncRoadmap({
            projectRoot: getProjectRoot(),
            roadmap: name,
            scene,
            apply,
          })
          if (format === 'json') {
            return output({ ok: true, data: report, human: JSON.stringify(report, null, 2) }, format)
          }
          console.log(`AssetMap: ${report.roadmap} (scene: ${report.scene})`)
          console.log(`Mode: ${report.applied ? 'APPLIED' : 'DRY-RUN'}`)
          console.log('')
          console.log(`Dangling: ${report.dangling.length}`)
          for (const d of report.dangling) {
            console.log(`  ${d.scene}: ${d.link.kind}/${d.link.name}`)
          }
          console.log(`Outdated: ${report.outdated.length}`)
          for (const o of report.outdated) {
            console.log(
              `  ${o.scene}: ${o.link.kind}/${o.link.name} (current abstract: "${o.currentAbstract.slice(0, 60)}...")`,
            )
          }
          console.log(`Orphans (not in AssetMap): ${report.orphans.length}`)
          for (const o of report.orphans) {
            console.log(`  ${o.kind}/${o.name}`)
          }
          if (report.applied) {
            console.log('')
            console.log(`✓ Removed: ${report.removedCount}, Refreshed: ${report.refreshedCount}`)
          } else if (report.dangling.length > 0 || report.outdated.length > 0) {
            console.log('')
            console.log(`Run 'oxn assetmap sync ${name}${scene ? ` --scene ${scene}` : ''} --apply' to write changes`)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          outputError({ code: 'OXN_ASSETMAP_SYNC_FAILED', message: msg })
        }
      },
    }),

    validate: defineCommand({
      meta: { name: 'validate', description: 'Validate an AssetMap (内部委托 oxn asset validate --kind roadmap)' },
      args: {
        name: { type: 'positional', required: true, description: 'AssetMap name' },
      },
      async run(ctx) {
        // Delegate to oxn asset validate for now (it does the Asset Paper 4 fields check)
        const args = ctx.args as unknown as { name: string; json?: boolean }
        const format = args.json ? 'json' : 'human'
        const { execSync } = await import('node:child_process')
        try {
          const out = execSync(`bun run packages/cli/src/index.ts asset validate ${args.name} --kind roadmap --json`, {
            cwd: getProjectRoot(),
            encoding: 'utf-8',
          })
          if (format === 'json') {
            process.stdout.write(out)
          } else {
            const result = JSON.parse(out)
            if (result.ok) console.log(`✓ AssetMap '${args.name}' valid`)
            else console.log(`✗ AssetMap '${args.name}' invalid: ${result.error?.message ?? ''}`)
          }
        } catch (err) {
          outputError({
            code: 'OXN_ASSETMAP_VALIDATE_FAILED',
            message: err instanceof Error ? err.message : String(err),
          })
        }
      },
    }),
  },
})
