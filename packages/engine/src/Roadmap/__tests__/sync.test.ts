/**
 * Roadmap/sync.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { syncRoadmap } from '../sync.js'
import { writeRoadmapMd } from './_helpers.js'

const TMP = '/tmp/oxn-sync-test'

function setupAssets() {
  // Create assetRoot structure
  mkdirSync(join(TMP, '.openxenon/assets/domains'), { recursive: true })
  mkdirSync(join(TMP, '.openxenon/assets/blueprints'), { recursive: true })
  mkdirSync(join(TMP, '.openxenon/assets/roadmaps'), { recursive: true })

  // Real assets
  writeFileSync(
    join(TMP, '.openxenon/assets/domains/RealDomain.md'),
    `---
entity: domain
version: 1
name: RealDomain
abstract: |
  Real domain description from Asset abstract
---
# Domain: RealDomain
`,
  )
  writeFileSync(
    join(TMP, '.openxenon/assets/blueprints/RealBlueprint.md'),
    `---
entity: blueprint
version: 1
name: RealBlueprint
abstract: |
  Real blueprint description from Asset abstract
---
# Blueprint: RealBlueprint
`,
  )
}

function cleanup() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true })
}

describe('syncRoadmap', () => {
  beforeEach(() => {
    cleanup()
    setupAssets()
  })
  afterEach(cleanup)

  test('detects dangling link (target does not exist)', () => {
    writeRoadmapMd(join(TMP, '.openxenon/assets/roadmaps/oxn-system.md'), [
      {
        name: 'dev',
        description: 'Dev',
        links: [
          { kind: 'domain', name: 'RealDomain', description: 'desc' },
          { kind: 'domain', name: 'GhostDomain', description: 'desc' }, // dangling
        ],
      },
    ])
    const report = syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system' })
    expect(report.dangling).toHaveLength(1)
    expect(report.dangling[0]?.link.name).toBe('GhostDomain')
  })

  test('detects outdated description (Asset.abstract changed)', () => {
    writeRoadmapMd(join(TMP, '.openxenon/assets/roadmaps/oxn-system.md'), [
      {
        name: 'dev',
        description: 'Dev',
        links: [{ kind: 'domain', name: 'RealDomain', description: 'OLD description' }],
      },
    ])
    const report = syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system' })
    expect(report.outdated).toHaveLength(1)
    expect(report.outdated[0]?.currentAbstract).toContain('Real domain description')
  })

  test('reports orphans (Assets not in Roadmap)', () => {
    writeRoadmapMd(join(TMP, '.openxenon/assets/roadmaps/oxn-system.md'), [
      {
        name: 'dev',
        description: 'Dev',
        links: [{ kind: 'domain', name: 'RealDomain', description: 'desc' }],
      },
    ])
    const report = syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system' })
    // RealBlueprint exists but not in Roadmap → orphan
    expect(report.orphans).toContainEqual({ kind: 'blueprint', name: 'RealBlueprint' })
  })

  test('scope to single scene', () => {
    writeRoadmapMd(join(TMP, '.openxenon/assets/roadmaps/oxn-system.md'), [
      {
        name: 'doc',
        description: 'Doc',
        links: [{ kind: 'domain', name: 'GhostInDoc', description: 'd' }],
      },
      {
        name: 'dev',
        description: 'Dev',
        links: [{ kind: 'domain', name: 'GhostInDev', description: 'd' }],
      },
    ])
    const report = syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system', scene: 'doc' })
    expect(report.scene).toBe('doc')
    expect(report.dangling).toHaveLength(1)
    expect(report.dangling[0]?.link.name).toBe('GhostInDoc')
  })

  test('--apply removes dangling links from .md', () => {
    const mdPath = join(TMP, '.openxenon/assets/roadmaps/oxn-system.md')
    writeRoadmapMd(mdPath, [
      {
        name: 'dev',
        description: 'Dev',
        links: [
          { kind: 'domain', name: 'RealDomain', description: 'desc' },
          { kind: 'domain', name: 'GhostDomain', description: 'desc' },
        ],
      },
    ])
    const beforeContent = require('node:fs').readFileSync(mdPath, 'utf-8') as string
    expect(beforeContent).toContain('GhostDomain')

    const report = syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system', apply: true })
    expect(report.applied).toBe(true)
    expect(report.removedCount).toBe(1)

    const afterContent = require('node:fs').readFileSync(mdPath, 'utf-8') as string
    expect(afterContent).not.toContain('GhostDomain')
    expect(afterContent).toContain('RealDomain')
  })

  test('dry-run does NOT modify .md', () => {
    const mdPath = join(TMP, '.openxenon/assets/roadmaps/oxn-system.md')
    writeRoadmapMd(mdPath, [
      {
        name: 'dev',
        description: 'Dev',
        links: [{ kind: 'domain', name: 'GhostDomain', description: 'd' }],
      },
    ])
    const beforeContent = require('node:fs').readFileSync(mdPath, 'utf-8') as string
    syncRoadmap({ projectRoot: TMP, roadmap: 'oxn-system' }) // dry-run default
    const afterContent = require('node:fs').readFileSync(mdPath, 'utf-8') as string
    expect(afterContent).toBe(beforeContent)
  })
})
