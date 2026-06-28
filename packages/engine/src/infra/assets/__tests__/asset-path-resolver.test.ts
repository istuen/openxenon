import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  resolveAssetDir,
  resolveAssetCandidates,
  resolveAndDetectAssetDir,
  migrateAssetsToV6Layout,
  DEFAULT_ASSET_ROOT,
  DEFAULT_ASSET_DIRS,
} from '../asset-path-resolver'

let tmp: string

beforeEach(() => {
  tmp = join(tmpdir(), `oxn-asset-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmp, { recursive: true })
  mkdirSync(join(tmp, '.openxenon'), { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('resolveAssetDir', () => {
  it('returns default v0.6 path when no config', () => {
    const p = resolveAssetDir(tmp, 'domain')
    expect(p).toBe(join(tmp, '.openxenon', DEFAULT_ASSET_ROOT, DEFAULT_ASSET_DIRS.domain))
  })

  it('honors config.assetDirs[kind]', () => {
    const p = resolveAssetDir(tmp, 'domain', {
      version: 1,
      mode: 'PRODUCTION',
      assetDirs: { domain: 'custom-domain' },
    })
    expect(p).toBe(join(tmp, '.openxenon', 'custom-domain'))
  })

  it('honors config.assetRoot + DEFAULT_ASSET_DIRS', () => {
    const p = resolveAssetDir(tmp, 'blueprint', {
      version: 1,
      mode: 'PRODUCTION',
      assetRoot: 'my-assets',
    })
    expect(p).toBe(join(tmp, '.openxenon', 'my-assets', DEFAULT_ASSET_DIRS.blueprint))
  })

  it('absolute path in assetDirs bypasses assetRoot', () => {
    const p = resolveAssetDir(tmp, 'domain', {
      version: 1,
      mode: 'PRODUCTION',
      assetDirs: { domain: '/etc/oxn/domain' },
    })
    expect(p).toBe('/etc/oxn/domain')
  })
})

describe('resolveAssetCandidates', () => {
  it('returns primary + fallback', () => {
    const r = resolveAssetCandidates(tmp, 'domain')
    expect(r.primary).toBe(join(tmp, '.openxenon', 'assets', 'domains'))
    expect(r.fallback).toBe(join(tmp, '.openxenon', 'domains'))
  })
})

describe('resolveAndDetectAssetDir', () => {
  it('returns primary when only primary exists', () => {
    const primary = resolveAssetDir(tmp, 'domain')
    mkdirSync(primary, { recursive: true })
    const r = resolveAndDetectAssetDir(tmp, 'domain')
    expect(r.path).toBe(primary)
    expect(r.fromFallback).toBe(false)
    expect(r.conflict).toBe(false)
  })

  it('returns fallback when only fallback exists', () => {
    const fallback = join(tmp, '.openxenon', 'domains')
    mkdirSync(fallback, { recursive: true })
    const r = resolveAndDetectAssetDir(tmp, 'domain')
    expect(r.path).toBe(fallback)
    expect(r.fromFallback).toBe(true)
    expect(r.conflict).toBe(false)
  })

  it('flags conflict when both exist', () => {
    const primary = resolveAssetDir(tmp, 'domain')
    const fallback = join(tmp, '.openxenon', 'domains')
    mkdirSync(primary, { recursive: true })
    mkdirSync(fallback, { recursive: true })
    const r = resolveAndDetectAssetDir(tmp, 'domain')
    expect(r.conflict).toBe(true)
  })

  it('returns primary path when neither exists', () => {
    const r = resolveAndDetectAssetDir(tmp, 'domain')
    expect(r.path).toBe(join(tmp, '.openxenon', 'assets', 'domains'))
    expect(r.fromFallback).toBe(false)
    expect(r.conflict).toBe(false)
  })
})

describe('migrateAssetsToV6Layout', () => {
  it('dry-run does not modify files', () => {
    const fallback = join(tmp, '.openxenon', 'domains')
    mkdirSync(fallback, { recursive: true })
    writeFileSync(join(fallback, 'Member.oxn'), 'domain "Member" {}')

    const r = migrateAssetsToV6Layout(tmp, null, true)
    expect(r.moved.length).toBeGreaterThan(0)
    expect(existsSync(join(fallback, 'Member.oxn'))).toBe(true) // still there
  })

  it('real run moves files from fallback to primary', () => {
    const fallback = join(tmp, '.openxenon', 'domains')
    mkdirSync(fallback, { recursive: true })
    writeFileSync(join(fallback, 'Member.oxn'), 'domain "Member" {}')
    writeFileSync(join(fallback, 'Order.oxn'), 'domain "Order" {}')

    const r = migrateAssetsToV6Layout(tmp, null, false)
    const domainMove = r.moved.find((m) => m.kind === 'domain')
    expect(domainMove).toBeDefined()
    expect(domainMove?.fileCount).toBe(2)

    const primary = join(tmp, '.openxenon', 'assets', 'domains')
    expect(existsSync(join(primary, 'Member.oxn'))).toBe(true)
    expect(existsSync(join(primary, 'Order.oxn'))).toBe(true)
  })

  it('updates config with defaults', () => {
    const fallback = join(tmp, '.openxenon', 'blueprint')
    mkdirSync(fallback, { recursive: true })
    writeFileSync(join(fallback, 'dev.oxn'), 'blueprint "dev" {}')

    const config = {
      version: 1,
      mode: 'PRODUCTION' as const,
      assetFormat: 'oxn' as const,
      autoSync: true,
    }
    const r = migrateAssetsToV6Layout(tmp, config, false)
    expect(r.configUpdated).toBe(true)
    expect(config.assetRoot).toBe(DEFAULT_ASSET_ROOT)
    expect(config.assetDirs?.domain).toBe(DEFAULT_ASSET_DIRS.domain)
    expect(config.assetDirs?.blueprint).toBe(DEFAULT_ASSET_DIRS.blueprint)
    expect(config.assetDirs?.stack).toBe(DEFAULT_ASSET_DIRS.stack)
  })

  it('skips kind when neither fallback nor primary has files', () => {
    const r = migrateAssetsToV6Layout(tmp, null, false)
    const domainSkip = r.skipped.find((s) => s.kind === 'domain')
    expect(domainSkip).toBeDefined()
    expect(domainSkip?.reason).toContain('no migration needed')
  })
})
