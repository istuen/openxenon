// =============================================================================
// domain-blueprint-compile-e2e.test.ts — A2
//
// CLI e2e：oxn domain compile + oxn blueprint compile
// v0.3.0 改革要求：error message 已建议 `oxn domain compile` 但 CLI 一直未实装
// 本测试验证 CLI 真正存在且功能正确
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-compile-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function runCliVerbose(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // 用于 --help 这类可能用 ANSI 清屏或 stdout 重定向的子命令
  return runCli(args)
}

async function initProject(): Promise<void> {
  const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await init.exited
}

describe('oxn domain compile (A2)', () => {
  test('domain compile 子命令存在（不报 unknown subcommand）', async () => {
    await initProject()
    // 不带 .oxn 文件应报 OXN_FILE_NOT_FOUND 而不是 unknown subcommand
    const r = await runCli(['domain', 'compile', 'NonExistent'])
    expect(r.exitCode).not.toBe(0)
    const combined = r.stdout + r.stderr
    expect(combined).toContain('OXN_FILE_NOT_FOUND')
    expect(combined).not.toContain('Unknown subcommand')
  })

  test('domain compile 把 .oxn 重编译为 v0.3 canonical 纯 MD', async () => {
    await initProject()
    // 1. 创建一个 domain 骨架
    const create = await runCli(['domain', 'create', 'OrderContext'])
    expect(create.exitCode).toBe(0)

    // 2. 立即编译（即使 .oxn 是 TODO 模板，compile 应能跑通）
    const compile = await runCli(['domain', 'compile', 'OrderContext'])
    expect(compile.exitCode).toBe(0)
    expect(compile.stdout).toContain('Compiled OrderContext')

    // 3. .md 输出到 .openxenon/domains-md/OrderContext.md
    const mdPath = join(tmpDir, '.openxenon', 'domains-md', 'OrderContext.md')
    expect(existsSync(mdPath)).toBe(true)
    const md = readFileSync(mdPath, 'utf-8')
    expect(md).toContain('# Domain: OrderContext')
    expect(md).toContain('---')
    expect(md).toContain('entity: domain')
  })

  test('domain compile --json 输出 JSON 格式 + contentHash', async () => {
    await initProject()
    await runCli(['domain', 'create', 'X'])
    const r = await runCli(['domain', 'compile', 'X', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('X')
    expect(json.data.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(json.data.target).toContain('.openxenon/domains-md/X.md')
  })

  test('domain compile 支持 PascalCase 与 kebab-case 互通（OrderContext）', async () => {
    await initProject()
    await runCli(['domain', 'create', 'OrderContext'])
    // PascalCase 名（与 create 一致）→ 找到 OrderContext.oxn
    const r = await runCli(['domain', 'compile', 'OrderContext'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Compiled OrderContext')
  })

  test('domain compile 非法名抛 OXN_INVALID_NAME', async () => {
    await initProject()
    const r = await runCli(['domain', 'compile', '123-invalid'])
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout + r.stderr).toContain('OXN_INVALID_NAME')
  })

  test('domain compile 在 .oxn 文件不存在时抛 OXN_FILE_NOT_FOUND', async () => {
    await initProject()
    const r = await runCli(['domain', 'compile', 'NonExistentDomain'])
    expect(r.exitCode).not.toBe(0)
    const combined = r.stdout + r.stderr
    expect(combined).toContain('OXN_FILE_NOT_FOUND')
    expect(combined).toContain('oxn domain create NonExistentDomain')
  })
})

describe('oxn blueprint compile (A2)', () => {
  test('blueprint compile 子命令存在', async () => {
    await initProject()
    const r = await runCli(['blueprint', 'compile', 'dev-workflow'])
    // 缺文件应报 OXN_FILE_NOT_FOUND
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout + r.stderr).toContain('OXN_FILE_NOT_FOUND')
  })

  test('blueprint compile 把 .oxn 重编译为 v0.3 canonical 纯 MD', async () => {
    await initProject()
    const create = await runCli(['blueprint', 'create', 'dev-workflow'])
    expect(create.exitCode).toBe(0)

    const compile = await runCli(['blueprint', 'compile', 'dev-workflow'])
    expect(compile.exitCode).toBe(0)
    expect(compile.stdout).toContain('Compiled dev-workflow')

    const mdPath = join(tmpDir, '.openxenon', 'blueprints-md', 'dev-workflow.md')
    expect(existsSync(mdPath)).toBe(true)
    const md = readFileSync(mdPath, 'utf-8')
    expect(md).toContain('# Blueprint: dev-workflow')
    expect(md).toContain('## Slots')
    expect(md).toContain('### stage-1')
  })

  test('blueprint compile --json 输出 JSON 格式', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'with-probe'])
    const r = await runCli(['blueprint', 'compile', 'with-probe', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('with-probe')
    expect(json.data.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('blueprint compile 在 .oxn 文件不存在时抛 OXN_FILE_NOT_FOUND', async () => {
    await initProject()
    const r = await runCli(['blueprint', 'compile', 'nope'])
    expect(r.exitCode).not.toBe(0)
    const combined = r.stdout + r.stderr
    expect(combined).toContain('OXN_FILE_NOT_FOUND')
  })
})

describe('oxn domain compile + 错误消息一致性 (A2)', () => {
  test('compile 端到端：.oxn → .md 可被 md-bridge 解析回 Domain 业务对象', async () => {
    // 端到端验证：create .oxn → compile .md → parseMdPipeline + EntityCompiler.parse()
    await initProject()
    await runCli(['domain', 'create', 'E2E'])
    const compile = await runCli(['domain', 'compile', 'E2E'])
    expect(compile.exitCode).toBe(0)

    // 验证 .md 文件可被 md-bridge 解析（验证 compile 产物可用）
    const { readFileSync } = await import('fs')
    const { runMdPipeline } = await import('../../oxl/md-bridge/pipeline.js')
    const { getEntityCompiler, registerEntityCompiler } = await import('../../oxl/md-bridge/entity-registry.js')
    const { DomainCompiler } = await import('../../oxl/md-bridge/compilers/domain-compiler.js')
    const { entityRegistry } = await import('../../oxl/md-bridge/entity-registry.js')

    entityRegistry._clearForTest()
    registerEntityCompiler(new DomainCompiler())

    const mdPath = `${tmpDir}/.openxenon/domains-md/E2E.md`
    const mdContent = readFileSync(mdPath, 'utf-8')
    const pipeline = runMdPipeline({ content: mdContent, filePath: mdPath })

    // pipeline 不抛 E_MD_DEPRECATED_SYNTAX
    const hasDeprecation = pipeline.errors.some((e) => e.rule === 'E_MD_DEPRECATED_SYNTAX')
    expect(hasDeprecation).toBe(false)

    // DomainCompiler.parse 可读出业务对象
    const compiler = getEntityCompiler('domain')
    const parsed = compiler.parse({
      mdast: pipeline.mdast,
      frontmatter: pipeline.frontmatter,
      filePath: mdPath,
    }) as { name: string; terms: Array<{ name: string }> }
    expect(parsed.name).toBe('E2E')
  })
})
