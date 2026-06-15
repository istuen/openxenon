// =============================================================================
// probe-templates.test.ts (T10 v0.2 Sprint 5b)
//
// 父文档 T6.5: 15 builtin probe 模板 + 含 scheme: 字段
// 注: builtin .oxn 文件是 template 形式 (含 align/prop/output), 不是 OXL PartProbeDeclaration
//     的可解析形式. 本测试只断言 scheme: 文本存在, 不强求 parse ok.
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const PROBES_DIR = join(import.meta.dir, '..', '..', '..', 'builtin', 'probes')

function listBuiltinProbes(): string[] {
  if (!existsSync(PROBES_DIR)) return []
  return readdirSync(PROBES_DIR)
    .filter((f) => f.endsWith('.oxn'))
    .map((f) => f.replace(/\.oxn$/, ''))
}

describe('builtin probe templates (T10 OXL 1.3 scheme:)', () => {
  const probes = listBuiltinProbes()
  test('至少有 14 个 builtin probe 模板', () => {
    expect(probes.length).toBeGreaterThanOrEqual(14)
  })

  for (const probe of probes) {
    test(`${probe}.oxn 含 scheme: 字段 + 合法 scheme 格式`, () => {
      const path = join(PROBES_DIR, `${probe}.oxn`)
      const content = readFileSync(path, 'utf-8')

      // 1. 文本中含 scheme = "..." 字段
      const m = content.match(/^\s*scheme\s*=\s*"([^"]+)"\s*$/m)
      expect(m).not.toBeNull()
      const scheme = m?.[1] ?? ''

      // 2. scheme 格式合法: 必以 "://" 结尾
      expect(scheme).toMatch(/^[a-z][a-z0-9+.-]*:\/\/$/)

      // 3. scheme 非空
      expect(scheme.length).toBeGreaterThan(0)
    })
  }
})
