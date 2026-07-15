/**
 * runtime.test.ts — 合并 runtime-detect / -file / -glob / -spawn / -which（v0.1.6）
 *
 * 测试 Runtime Adapter：工厂化跨 Bun/Node/Deno 适配层。
 * 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectViaCmdline, getRuntimeName, isBun, isDeno } from '../detect'
import { glob, openFile, spawn, which } from '../index'

// ───────── runtime/detect ─────────

describe('runtime/detect', () => {
  test('isBun 当前 runtime 识别（缓存值）', () => {
    expect(isBun()).toBe(!!process.versions.bun)
  })

  test('isDeno 当前 runtime 识别（缓存值）', () => {
    expect(isDeno()).toBe(!!(globalThis as { Deno?: unknown }).Deno)
  })

  test('isBun 跨次调用一致（缓存生效）', () => {
    const a = isBun()
    const b = isBun()
    const c = isBun()
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  test('getRuntimeName 返字符串', () => {
    expect(['bun', 'node', 'deno', 'unknown']).toContain(getRuntimeName())
  })

  test('detectViaCmdline 兼容 bun --bun 启动', () => {
    expect(['bun', 'node']).toContain(detectViaCmdline())
  })
})

// ───────── runtime/which ─────────

describe('runtime/which', () => {
  test('找到 PATH 里的可执行文件（echo）', async () => {
    const path = await which('echo')
    expect(path).not.toBeNull()
    expect(path).toMatch(/echo$/)
  })

  test('找不到不存在的命令', async () => {
    const path = await which('oxn-nonexistent-command-12345')
    expect(path).toBeNull()
  })
})

// ───────── runtime/spawn ─────────

describe('runtime/spawn', () => {
  test('echo 命令成功 + stdout 缓冲为 string', async () => {
    const result = await spawn(['echo', 'hello from runtime'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('hello from runtime')
    expect(result.stderr).toBe('')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('exit 1 命令：exitCode=1, stdout 含错误', async () => {
    const result = await spawn(['sh', '-c', 'echo error_msg 1>&2; exit 1'])
    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('error_msg')
  })

  test('timeout 触发：进程被 SIGKILL（exitCode=137）', async () => {
    const result = await spawn(['sleep', '5'], { timeout: 200 })
    const killed = result.exitCode === null || result.exitCode === 137
    expect(killed).toBe(true)
    expect(result.durationMs).toBeLessThan(2000)
  })

  test('cwd 选项生效', async () => {
    const result = await spawn(['pwd'], { cwd: '/tmp' })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim().replace('/private/tmp', '/tmp')).toBe('/tmp')
  })

  test('env 选项覆盖', async () => {
    const result = await spawn(['sh', '-c', 'echo $MY_TEST_VAR'], {
      env: { MY_TEST_VAR: 'adapter_env_works', PATH: process.env.PATH ?? '' },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('adapter_env_works')
  })
})

// ───────── runtime/file ─────────

describe('runtime/file', () => {
  let tmpDir: string
  let jsonFile: string
  let textFile: string
  let missingFile: string

  beforeAll(() => {
    tmpDir = join(tmpdir(), 'oxn-runtime-file-test')
    mkdirSync(tmpDir, { recursive: true })
    jsonFile = join(tmpDir, 'sample.json')
    textFile = join(tmpDir, 'sample.txt')
    missingFile = join(tmpDir, 'does-not-exist.txt')
    writeFileSync(jsonFile, JSON.stringify({ name: 'adapter', version: '0.1.6' }, null, 2), 'utf-8')
    writeFileSync(textFile, 'hello file adapter\n', 'utf-8')
  })

  afterAll(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('text() 读全文', async () => {
    const f = await openFile(textFile)
    expect(await f.text()).toBe('hello file adapter\n')
  })

  test('json() 读全文 + JSON.parse', async () => {
    const f = await openFile(jsonFile)
    const data = (await f.json()) as { name: string; version: string }
    expect(data.name).toBe('adapter')
    expect(data.version).toBe('0.1.6')
  })

  test('exists() 命中 + 不命中', async () => {
    const f1 = await openFile(textFile)
    expect(await f1.exists()).toBe(true)

    const f2 = await openFile(missingFile)
    expect(await f2.exists()).toBe(false)
  })

  test('write() 覆盖写', async () => {
    const target = join(tmpDir, 'write-target.txt')
    const f = await openFile(target)
    await f.write('written by adapter\n')
    expect(readFileSync(target, 'utf-8')).toBe('written by adapter\n')
  })
})

// ───────── runtime/glob ─────────

describe('runtime/glob', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = join(tmpdir(), 'oxn-runtime-glob-test')
    mkdirSync(join(tmpDir, 'sub'), { recursive: true })
    writeFileSync(join(tmpDir, 'a.ts'), '// a', 'utf-8')
    writeFileSync(join(tmpDir, 'b.ts'), '// b', 'utf-8')
    writeFileSync(join(tmpDir, 'sub', 'c.ts'), '// c', 'utf-8')
    writeFileSync(join(tmpDir, 'sub', 'd.json'), '{}', 'utf-8')
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('1 pattern 匹配多个文件', async () => {
    const results = await glob('*.ts', { cwd: tmpDir })
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.some((p) => p.endsWith('a.ts'))).toBe(true)
    expect(results.some((p) => p.endsWith('b.ts'))).toBe(true)
  })

  test('多 pattern 匹配多类型', async () => {
    const results = await glob('**/*.{ts,json}', { cwd: tmpDir })
    expect(results.length).toBeGreaterThanOrEqual(4)
  })

  test('cwd 选项生效（隔离扫描根）', async () => {
    const results = await glob('*.ts', { cwd: join(tmpDir, 'sub') })
    expect(results.length).toBe(1)
    expect(results[0]?.endsWith('c.ts')).toBe(true)
  })
})
