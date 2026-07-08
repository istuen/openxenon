/**
 * roadmap-compiler.test.ts — v0.6.1-alpha.1 (Asset 缺口全补 Phase 1)
 *
 * 验证 RoadmapCompiler 实现完整：
 * - 6 AssetKind create e2e（含 roadmap）
 * - Roadmap .oxn → .md 编译 (compileOxnToMd)
 * - detectEntityType 正确识别 RoadmapDeclaration
 * - RoadmapCompiler 注册到 entity registry
 * - VALID_ASSET_KINDS 含 'roadmap'
 * - createRoadmapTemplate() 语法合规
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RoadmapCompiler } from '../compilers/roadmap-compiler.js'
import { entityRegistry, getEntityCompiler } from '../entity-registry.js'
// 副作用 import：注册 9 个 EntityCompiler
import '../compilers/index.js'

let tmpDir: string

describe('RoadmapCompiler 单元测试', () => {
  test('1. RoadmapCompiler.entityType = "roadmap"', () => {
    const compiler = new RoadmapCompiler()
    expect(compiler.entityType).toBe('roadmap')
  })

  test('2. RoadmapCompiler 注册到 entity-registry (9 个 compiler)', () => {
    expect(entityRegistry.list()).toContain('roadmap')
    const compiler = getEntityCompiler('roadmap')
    expect(compiler).toBeInstanceOf(RoadmapCompiler)
  })
})

describe('Roadmap .oxn → .md round-trip 编译', () => {
  test('3. compileOxnToMd 正确处理 RoadmapDeclaration', async () => {
    const oxnContent = `// Roadmap: my-roadmap
roadmap "my-roadmap" {
  abstract = "TODO: one-line description"

  "@prj/domains/MemberContext"
  "@prj/blueprints/dev-workflow"
}
`
    const { compileOxnToMd } = await import('../oxl-md-decompiler.js')
    const result = await compileOxnToMd(oxnContent, { entity: 'roadmap' })
    expect(result.entity).toBe('roadmap')
    expect(result.name).toBe('my-roadmap')
    expect(result.md).toContain('# Roadmap: my-roadmap')
    expect(result.md).toContain('## Links')
    expect(result.md).toContain('### link-1')
    expect(result.md).toContain('### link-2')
    expect(result.md).toContain('- target: @prj/domains/MemberContext')
    expect(result.md).toContain('- target: @prj/blueprints/dev-workflow')
  })

  test('4. detectEntityType switch case RoadmapDeclaration 存在', async () => {
    // 通过 compileOxnToMd 间接验证（没有 export detectEntityType）
    const oxnContent = `roadmap "x" { abstract = "a" }`
    const { compileOxnToMd } = await import('../oxl-md-decompiler.js')
    const result = await compileOxnToMd(oxnContent) // 不传 entity，让 detectEntityType 自动判断
    expect(result.entity).toBe('roadmap')
  })
})

describe('oxn work create --type asset --asset-kind roadmap e2e', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-roadmap-'))
    mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'config.json'),
      JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
    )
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cliPath = join(process.cwd(), 'packages', 'cli', 'src', 'index.ts')
    const proc = Bun.spawn(['bun', cliPath, ...args], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited
    return { stdout, stderr, exitCode }
  }

  test('5. roadmap CLI 创建成功 + 落 .openxenon/assets/roadmaps/<name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'my-roadmap', '--type', 'asset', '--asset-kind', 'roadmap', '--json'])
    if (r.exitCode !== 0) {
      console.error('STDERR:', r.stderr)
      console.error('STDOUT:', r.stdout)
    }
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'roadmaps', 'my-roadmap.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('roadmap "my-roadmap"')
    expect(content).toContain('abstract =')
    expect(content).toContain('@prj/domains/MemberContext')
    expect(content).toContain('@prj/blueprints/dev-workflow')
  })

  test('6. 6 AssetKind create 全部成功（domain/blueprint/stack/roadmap/library/external）', async () => {
    const kinds: Array<[string, string]> = [
      ['domain', 'MyDomain'],
      ['blueprint', 'my-blueprint'],
      ['stack', 'my-stack'],
      ['roadmap', 'my-roadmap'],
      ['library', 'my-library'],
      ['external', 'my-external'],
    ]
    for (const [kind, name] of kinds) {
      const r = await runCli(['work', 'create', name, '--type', 'asset', '--asset-kind', kind, '--json'])
      expect(r.exitCode).toBe(0)
      const ext = kind === 'domain' ? 'oxn' : 'oxn'
      const dir =
        kind === 'domain'
          ? 'domains'
          : kind === 'blueprint'
            ? 'blueprints'
            : kind === 'stack'
              ? 'stack'
              : kind === 'roadmap'
                ? 'roadmaps'
                : kind === 'library'
                  ? 'libraries'
                  : 'externals'
      const assetPath = join(tmpDir, '.openxenon', 'assets', dir, `${name}.${ext}`)
      expect(existsSync(assetPath)).toBe(true)
    }
  })

  test('7. VALID_ASSET_KINDS error message 包含 roadmap', async () => {
    const r = await runCli(['work', 'create', 'x', '--type', 'asset', '--asset-kind', 'invalid', '--json'])
    expect(r.exitCode).not.toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.error.code).toBe('OXN_INVALID_ASSET_KIND')
    expect(json.error.suggestion).toContain('roadmap')
  })
})
