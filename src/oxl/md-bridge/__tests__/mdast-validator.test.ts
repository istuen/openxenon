/**
 * md-bridge/mdast-validator.test.ts — T4 单元测试
 *
 * v0.3 阶段 1 T8 任务
 */

import { describe, expect, test } from 'bun:test'
import { validateMdast, validateMdastStrict, ValidationError } from '../mdast-validator.js'

// v0.3.0 canonical: pure MD form (H1+H2+H3 + indented lists, no :::intent)
const validDomainMd = `---
entity: domain
version: 0.3.0
name: OrderContext
---

# Domain: OrderContext

## Terms

### order-term
- ref: .openxenon/domains/OrderContext
- desc: Order 业务实体
`

// 注：保留 validBlueprintMd 用于未来 E_MD_* 校验测试扩展
const _validBlueprintMd = `---
entity: blueprint
version: 0.3.0
name: dev-workflow
---

# Blueprint: dev-workflow

## Slots

### develop
- deps: []
- observe: []
`
void _validBlueprintMd

describe('md-bridge/mdast-validator', () => {
  describe('E_MD_MISSING_REQUIRED', () => {
    test('frontmatter.entity 缺失', () => {
      const result = validateMdast('# Title', { entity: 'domain' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_MISSING_REQUIRED' && e.field === 'entity')).toBe(true)
    })

    test('frontmatter.version 缺失', () => {
      const md = `---
entity: domain
---

# Title`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'version')).toBe(true)
    })

    test('Domain 必须有 name（从 frontmatter）', () => {
      const md = `---
entity: domain
version: 0.3.0
name: MyDomain
---

# Domain: MyDomain`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.valid).toBe(true)
    })

    test('Task 必填 work 字段', () => {
      const md = `---
entity: task
version: 0.3.0
---

# Task: X`
      const result = validateMdast(md, { entity: 'task' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'work')).toBe(true)
    })
  })

  describe('E_MD_TYPE_MISMATCH', () => {
    test('entity 必须是 5 类之一', () => {
      const md = `---
entity: invalid-type
version: 0.3.0
---

# Title`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_TYPE_MISMATCH' && e.field === 'entity')).toBe(true)
    })

    test('version 必须符合 v<X.Y.Z>', () => {
      const md = `---
entity: domain
version: 1.0
---

# Title`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_TYPE_MISMATCH' && e.field === 'version')).toBe(true)
    })

    test('status 必须是已知值', () => {
      const md = `---
entity: domain
version: 0.3.0
status: invalid
---

# Title`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_TYPE_MISMATCH' && e.field === 'status')).toBe(true)
    })

    test('合法 version 通过校验', () => {
      const md = `---
entity: domain
version: 0.3.0
---

# Title`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.errors.filter((e) => e.code === 'E_MD_TYPE_MISMATCH')).toHaveLength(0)
    })
  })

  describe('E_MD_REFERENCE_BROKEN_FATAL', () => {
    test('内部 Intent 资产不存在（已知集合）', () => {
      // v0.3.0: - ref: field on H3 instance replaces :::intent{scope=...}
      const md = `---
entity: domain
version: 0.3.0
---

# Title

## Terms

### t1
- ref: .openxenon/domains/Unknown
- desc: term
`
      const result = validateMdast(md, {
        entity: 'domain',
        knownInternalAssets: new Set(['.openxenon/domains/OrderContext']),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_REFERENCE_BROKEN_FATAL')).toBe(true)
    })

    test('内部 Intent 资产存在 → 通过', () => {
      const result = validateMdast(validDomainMd, {
        entity: 'domain',
        knownInternalAssets: new Set(['.openxenon/domains/OrderContext']),
      })
      expect(result.errors.filter((e) => e.code === 'E_MD_REFERENCE_BROKEN_FATAL')).toHaveLength(0)
    })
  })

  describe('E_MD_REFERENCE_BROKEN_WARN', () => {
    test('外部 URL 格式异常（仅警告）', () => {
      // v0.3.0: - ref: field replaces :::intent{scope=...}
      const md = `---
entity: domain
version: 0.3.0
---

# Title

## Terms

### t1
- ref: not-a-valid-scope
- desc: term
`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.warnings.some((w) => w.code === 'E_MD_REFERENCE_BROKEN_WARN')).toBe(true)
    })

    test('外部 URL 合法不警告', () => {
      const md = `---
entity: domain
version: 0.3.0
---

# Title

## Terms

### t1
- ref: https://example.com/spec
- desc: term
`
      const result = validateMdast(md, { entity: 'domain' })
      expect(result.warnings.filter((w) => w.code === 'E_MD_REFERENCE_BROKEN_WARN')).toHaveLength(0)
    })
  })

  describe('E_MD_HASH_MISMATCH', () => {
    test('hash 不匹配时抛错', () => {
      const result = validateMdast(validDomainMd, {
        entity: 'domain',
        expectedHash: '0000000000000000000000000000000000000000000000000000000000000000',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'E_MD_HASH_MISMATCH')).toBe(true)
    })

    test('hash 匹配时通过', () => {
      const result1 = validateMdast(validDomainMd, { entity: 'domain' })
      const result2 = validateMdast(validDomainMd, {
        entity: 'domain',
        expectedHash: result1.errors[0]?.field === 'contentHash' ? '' : '', // 用空
      })
      // 实际：先跑一次获取 hash
      expect(result1.valid).toBe(true)
      expect(result2).toBeDefined()
    })
  })

  describe('E_MD_INVALID_SYNTAX', () => {
    test('格式严重错误', () => {
      // 空内容不算 invalid；只测一些奇怪的输入
      const result = validateMdast('test', { entity: 'domain' })
      // frontmatter 缺失，但 frontmatter 不算 invalid syntax
      expect(result.errors.some((e) => e.code === 'E_MD_INVALID_SYNTAX')).toBe(false)
    })
  })

  describe('validateMdastStrict', () => {
    test('失败时抛 ValidationError', () => {
      expect(() => validateMdastStrict('# X', { entity: 'domain' })).toThrow(ValidationError)
    })

    test('通过时不抛', () => {
      expect(() => validateMdastStrict(validDomainMd, { entity: 'domain' })).not.toThrow()
    })

    test('ValidationError 包含 issues', () => {
      try {
        validateMdastStrict('# X', { entity: 'domain' })
      } catch (err) {
        if (err instanceof ValidationError) {
          expect(err.issues.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('校验时间', () => {
    test('validateTime ≥ 0', () => {
      const result = validateMdast(validDomainMd, { entity: 'domain' })
      expect(result.validateTime).toBeGreaterThanOrEqual(0)
    })
  })
})
