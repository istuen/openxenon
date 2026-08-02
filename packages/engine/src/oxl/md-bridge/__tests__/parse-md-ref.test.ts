/**
 * parse-md-ref.test.ts — 15 cases 验证 @md/... 前缀解析
 *
 * v0.6.1 PR-2 (D-γ b) 锁定：Work 引用值必须用 `@md/<scope>/<name>` 格式
 *
 * 覆盖：
 *   - 合法 4 类 scope（blueprints/domains/stacks/roadmaps）
 *   - 非法 prefix（裸名 / @prj/ / @oxn/ / 旧 ::intent）
 *   - scope-kind 不一致（blueprint 字段用了 @md/domains/）
 *   - name 非法字符
 *   - 空字符串 / 空字段
 *   - round-trip：scope + name 拆解正确
 */

import { describe, expect, test } from 'bun:test'
import { IAPError, IAPAction } from '../../../kernel/contracts/iap-error.js'
import { parseMdRef, kindToScope, type MdRef } from '../parse-md-ref.js'

describe('parseMdRef — v0.6.1 PR-2 (D-γ b)', () => {
  describe('合法 4 类 scope', () => {
    test('1. @md/blueprints/dev-workflow 解析为 blueprint', () => {
      const r: MdRef = parseMdRef('@md/blueprints/dev-workflow', 'blueprint')
      expect(r.scope).toBe('blueprints')
      expect(r.name).toBe('dev-workflow')
      expect(r.raw).toBe('@md/blueprints/dev-workflow')
    })

    test('2. @md/domains/MemberContext 解析为 domain（PascalCase 合法）', () => {
      const r = parseMdRef('@md/domains/MemberContext', 'domain')
      expect(r.scope).toBe('domains')
      expect(r.name).toBe('MemberContext')
    })

    test('3. @md/stacks/ts-stack 解析为 stack（kebab-case 合法）', () => {
      const r = parseMdRef('@md/stacks/ts-stack', 'stack')
      expect(r.scope).toBe('stacks')
      expect(r.name).toBe('ts-stack')
    })

    test('4. @md/assetmaps/q3-assetmap 解析为 roadmap', () => {
      const r = parseMdRef('@md/assetmaps/q3-assetmap', 'roadmap')
      expect(r.scope).toBe('assetmaps')
      expect(r.name).toBe('q3-assetmap')
    })
  })

  describe('非法 prefix（裸名 / @prj/ / @oxn/ / 旧 :::intent）', () => {
    test('5. 裸名 "dev-workflow" 抛 REFERENCE_PREFIX_INVALID', () => {
      expect(() => parseMdRef('dev-workflow', 'blueprint')).toThrow(IAPError)
      try {
        parseMdRef('dev-workflow', 'blueprint')
      } catch (e) {
        const err = e as IAPError
        expect(err.code).toBe('REFERENCE_PREFIX_INVALID')
        expect(err.axis).toBe('INTENT')
        expect(err.action).toBe(IAPAction.AUTONOMOUS_RETRY)
        expect(err.context?.raw).toBe('dev-workflow')
      }
    })

    test('6. @prj/blueprints/dev-workflow 抛错（旧 OXL 语法不兼容）', () => {
      expect(() => parseMdRef('@prj/blueprints/dev-workflow', 'blueprint')).toThrow(IAPError)
    })

    test('7. @oxn/blueprints/X 抛错（builtin ref 不兼容 @md/）', () => {
      expect(() => parseMdRef('@oxn/blueprints/x', 'blueprint')).toThrow(IAPError)
    })

    test('8. 完整 :::intent 容器抛错（v0.6.1 PR-1 已切 E_MD_DEPRECATED_SYNTAX）', () => {
      expect(() => parseMdRef(':::intent{...}', 'blueprint')).toThrow(IAPError)
    })
  })

  describe('scope-kind 不一致', () => {
    test('9. blueprint 字段用 @md/domains/MemberContext 抛错', () => {
      expect(() => parseMdRef('@md/domains/MemberContext', 'blueprint')).toThrow(IAPError)
      try {
        parseMdRef('@md/domains/MemberContext', 'blueprint')
      } catch (e) {
        const err = e as IAPError
        expect(err.message).toContain("'domains'")
        expect(err.context?.expectedKind).toBe('blueprint')
        expect(err.context?.scope).toBe('domains')
      }
    })

    test('10. domain 字段用 @md/blueprints/dev-workflow 抛错', () => {
      expect(() => parseMdRef('@md/blueprints/dev-workflow', 'domain')).toThrow(IAPError)
    })

    test('11. 非法 scope "tasks" 抛错（tasks 不是 AssetKind）', () => {
      expect(() => parseMdRef('@md/tasks/x', 'task' as 'domain')).toThrow(IAPError)
      try {
        // @ts-expect-error 测试非法 kind
        parseMdRef('@md/tasks/x', 'task')
      } catch (e) {
        const err = e as IAPError
        expect(err.message).toContain('Invalid @md/ scope')
        expect(err.context?.scope).toBe('tasks')
      }
    })
  })

  describe('name 非法字符', () => {
    test('12. 空 name（"@md/blueprints/"）抛错', () => {
      expect(() => parseMdRef('@md/blueprints/', 'blueprint')).toThrow(IAPError)
    })

    test('13. 数字开头 name 抛错', () => {
      expect(() => parseMdRef('@md/blueprints/123abc', 'blueprint')).toThrow(IAPError)
    })

    test('14. 多 slash（"@md/blueprints/x/y"）抛错（仅 1 段 separator）', () => {
      expect(() => parseMdRef('@md/blueprints/x/y', 'blueprint')).toThrow(IAPError)
    })
  })

  describe('空字符串 + boundary', () => {
    test('15. 空字符串抛错', () => {
      expect(() => parseMdRef('', 'blueprint')).toThrow(IAPError)
    })
  })

  describe('kindToScope — helper', () => {
    test('16. 4 类 kind → scope 映射', () => {
      expect(kindToScope('blueprint')).toBe('blueprints')
      expect(kindToScope('domain')).toBe('domains')
      expect(kindToScope('stack')).toBe('stacks')
      expect(kindToScope('roadmap')).toBe('assetmaps')
    })
  })
})
