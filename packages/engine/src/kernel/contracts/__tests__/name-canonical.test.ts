// =============================================================================
// name-canonical.test.ts (v1.1 — L0-Contract 单元测试)
//
// 覆盖 src/kernel/contracts/name-canonical.ts 的 3 个导出：
//   1. toKebab — 字符串归一化
//   2. assertNameFileConsistent — 文件式布局（domain / blueprint）
//   3. assertDirNameConsistent — 目录式布局（work / proof）
//
// 设计动机（v1.1）：原本 toKebab/assertNameFileConsistent 在 src/cli/domain.ts (L3)，
// 上移到 L0-Contract 后允许 L1-OXL 的 parseDomainSlim 也调用，软检测 NAME_FILE_MISMATCH。
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { IAPError } from '../iap-error'
import { assertDirNameConsistent, assertNameFileConsistent, toKebab } from '../name-canonical'

describe('toKebab (L0-Contract)', () => {
  test('PascalCase → kebab-case', () => {
    expect(toKebab('MemberContext')).toBe('member-context')
    expect(toKebab('WechatMinigameContext')).toBe('wechat-minigame-context')
    expect(toKebab('A')).toBe('a')
  })

  test('camelCase → kebab-case', () => {
    expect(toKebab('memberContext')).toBe('member-context')
    expect(toKebab('wechatMinigame')).toBe('wechat-minigame')
  })

  test('snake_case → kebab-case', () => {
    expect(toKebab('wechat_minigame')).toBe('wechat-minigame')
    expect(toKebab('a_b_c')).toBe('a-b-c')
  })

  test('连续大写处理（HTMLParser → html-parser）', () => {
    expect(toKebab('HTMLParser')).toBe('html-parser')
    expect(toKebab('CLIContext')).toBe('cli-context')
    expect(toKebab('URLPath')).toBe('url-path')
  })

  test('已是 kebab-case → 原样', () => {
    expect(toKebab('work-context')).toBe('work-context')
    expect(toKebab('a-b-c')).toBe('a-b-c')
  })

  test('空字符串 → 空字符串', () => {
    expect(toKebab('')).toBe('')
  })
})

describe('assertNameFileConsistent (L0-Contract, 文件式布局)', () => {
  test('domain: PascalCase 声明 vs kebab 文件 → 不抛错（规范化后一致）', () => {
    expect(() =>
      assertNameFileConsistent('MemberContext', '/p/.openxenon/domains/member-context.md', 'domain'),
    ).not.toThrow()
  })

  test('blueprint: 已是 kebab-case → 不抛错', () => {
    expect(() =>
      assertNameFileConsistent('fix-issue', '/p/.openxenon/blueprints/fix-issue.md', 'blueprint'),
    ).not.toThrow()
  })

  test('work: 目录式布局不在 assertNameFileConsistent 适用范围（应使用 assertDirNameConsistent）', () => {
    // 这里测的是「同名抛错」: work.md basename 是 'work',声明 'fix-domain-name',toKebab 不一致 → 抛错
    // 这是预期的:work/proof 必须用 assertDirNameConsistent
    expect(() =>
      assertNameFileConsistent('fix-domain-name', '/p/.openxenon/works/fix-domain-name/work.md', 'work'),
    ).toThrow(IAPError)
  })

  test('proof: 目录式布局不在 assertNameFileConsistent 适用范围（应使用 assertDirNameConsistent）', () => {
    expect(() =>
      assertNameFileConsistent('check-deploy', '/p/.openxenon/proofs/check-deploy/proof.md', 'proof'),
    ).toThrow(IAPError)
  })

  test('snake_case 声明 vs kebab 文件 → 不抛错', () => {
    expect(() =>
      assertNameFileConsistent('wechat_minigame', '/p/.openxenon/domains/wechat-minigame.md', 'domain'),
    ).not.toThrow()
  })

  test('不匹配 → 抛 IAPError NAME_FILE_MISMATCH', () => {
    let caught: unknown = null
    try {
      assertNameFileConsistent('Foo', '/p/.openxenon/domains/bar.md', 'domain')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    const err = caught as IAPError
    expect(err.name).toBe('IAP_INTENT_NAME_FILE_MISMATCH')
    expect(err.axis).toBe('INTENT')
    expect(err.code).toBe('NAME_FILE_MISMATCH')
    expect(err.action).toBe('YIELD_TO_HUMAN')
    expect(err.message).toContain("'Foo'")
    expect(err.message).toContain("'bar.md'")
    expect(err.context?.entityType).toBe('domain')
    expect(err.context?.declared).toBe('Foo')
    expect(err.context?.file).toBe('bar.md')
    expect(err.context?.normalized).toBe('foo')
  })

  test('blueprint 不匹配时 entityType=blueprint', () => {
    let caught: unknown = null
    try {
      assertNameFileConsistent('MyBP', '/p/.openxenon/blueprints/other.md', 'blueprint')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    expect((caught as IAPError).context?.entityType).toBe('blueprint')
  })

  test('path 含特殊字符（macOS APFS case-insensitive 模拟） → 走字符串归一，不依赖 fs lookup', () => {
    // 文件路径含 MemberContext.md (PascalCase)
    // 声明 kebab-case member-context
    // toKebab 后等价 → 不抛错
    expect(() =>
      assertNameFileConsistent('member-context', '/p/.openxenon/domains/MemberContext.md', 'domain'),
    ).not.toThrow()
  })
})

describe('assertDirNameConsistent (L0-Contract, 目录式布局)', () => {
  test('work: PascalCase 声明 vs kebab 目录 → 不抛错', () => {
    expect(() => assertDirNameConsistent('FixIssue', '/p/.openxenon/works/fix-issue', 'work')).not.toThrow()
  })

  test('proof: kebab-case 声明 vs kebab 目录 → 不抛错', () => {
    expect(() => assertDirNameConsistent('check-deploy', '/p/.openxenon/proofs/check-deploy', 'proof')).not.toThrow()
  })

  test('不匹配 → 抛 IAPError NAME_FILE_MISMATCH', () => {
    let caught: unknown = null
    try {
      assertDirNameConsistent('Foo', '/p/.openxenon/works/bar', 'work')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    const err = caught as IAPError
    expect(err.name).toBe('IAP_INTENT_NAME_FILE_MISMATCH')
    expect(err.code).toBe('NAME_FILE_MISMATCH')
    expect(err.message).toContain("'Foo'")
    expect(err.message).toContain("'bar'")
    expect(err.context?.entityType).toBe('work')
    expect(err.context?.declared).toBe('Foo')
    expect(err.context?.dir).toBe('bar')
    expect(err.context?.normalized).toBe('foo')
  })

  test('proof 不匹配时 entityType=proof', () => {
    let caught: unknown = null
    try {
      assertDirNameConsistent('CheckDeploy', '/p/.openxenon/proofs/different', 'proof')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    expect((caught as IAPError).context?.entityType).toBe('proof')
  })

  test('snake_case 声明 vs kebab 目录 → 不抛错', () => {
    expect(() => assertDirNameConsistent('check_deploy', '/p/.openxenon/proofs/check-deploy', 'proof')).not.toThrow()
  })
})

describe('L0-Contract 物理归位约束', () => {
  test('name-canonical.ts 不引入 fs / net / child_process（Kernel 是兰姆达真空）', async () => {
    const src = await Bun.file('packages/engine/src/kernel/contracts/name-canonical.ts').text()
    expect(src).not.toMatch(/from\s+['"]fs['"]|from\s+['"]node:fs['"]/)
    expect(src).not.toMatch(/from\s+['"]net['"]|from\s+['"]node:net['"]/)
    expect(src).not.toMatch(/from\s+['"]child_process['"]|from\s+['"]node:child_process['"]/)
    expect(src).not.toMatch(/process\.env|process\.std/)
  })

  test('name-canonical.ts 仅 import 同层 iap-error 与 path.basename（合规）', async () => {
    const src = await Bun.file('packages/engine/src/kernel/contracts/name-canonical.ts').text()
    expect(src).toMatch(/from\s+['"]\.\/iap-error['"]/)
    expect(src).toMatch(/from\s+['"]path['"]/)
    // 不能 import L0-Processor / L1+ / L2 / L3
    expect(src).not.toMatch(/from\s+['"]\.\.\/\.\.\/kernel\/(processors|probes)/)
    expect(src).not.toMatch(/from\s+['"]\.\.\/\.\.\/(oxl|infra|work|cli|daemon|builtin)/)
  })
})
