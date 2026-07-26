/**
 * md-bridge/mdast-to-kernel.test.ts — T5 单元测试（**核心**）
 *
 * v0.3 阶段 1 T8 任务
 */

import { describe, expect, test } from 'bun:test'
import { mdastToKernel, MdastToKernelError } from '../mdast-to-kernel.js'

// v0.3.0 canonical: 纯 MD 形式
const validDomainMd = `---
entity: domain
version: 0.3.0
name: OrderContext
---

# Domain: OrderContext

## Terms

### order-term
- desc: Order 业务实体
`

const validBlueprintMd = `---
entity: blueprint
version: 1.0.0
name: dev-workflow
---

# Blueprint: dev-workflow

## Props

### input
- type: string

## Slots

### develop
- deps: []
- observe: []
`

const validWorkMd = `---
entity: work
version: 0.3.0
name: feature-x
---

# Work: feature-x

## Context

### primary
- goal: 实现 X
- max_iterations: 3

## Tasks

### step1
- deps: []

### step2
- deps:
  - step1
`

describe('md-bridge/mdast-to-kernel', () => {
  describe('Domain 转换', () => {
    test('Domain → FrozenBlueprint', () => {
      const result = mdastToKernel({
        entity: 'domain',
        filePath: '.openxenon/domains/OrderContext.md',
        content: validDomainMd,
      })

      // result.meta 是 first part 的 XenonMeta
      expect(result.meta.ref).toBe('@prj/domain/OrderContext')
      expect(result.frozen.name).toBe('OrderContext')
      expect(result.meta.resolved_from).toBe('project')
      expect(result.meta.content_hash).toMatch(/^[a-f0-9]{64}$/)
    })

    test('Domain 含 0 part（Domain 不执行）', () => {
      const result = mdastToKernel({
        entity: 'domain',
        filePath: '.openxenon/domains/OrderContext.md',
        content: validDomainMd,
      })
      // convertDomainToCompiled 创建 1 个 part（domain reference）
      expect(result.frozen.parts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Blueprint 转换', () => {
    test('Blueprint → FrozenBlueprint 含 parts', () => {
      const result = mdastToKernel({
        entity: 'blueprint',
        filePath: '.openxenon/blueprints/dev-workflow.md',
        content: validBlueprintMd,
      })

      expect(result.frozen.name).toBe('dev-workflow')
      expect(result.frozen.parts.length).toBeGreaterThan(0)
    })

    test('Blueprint slot → FrozenPart', () => {
      const result = mdastToKernel({
        entity: 'blueprint',
        filePath: '.openxenon/blueprints/dev-workflow.md',
        content: validBlueprintMd,
      })

      const firstPart = result.frozen.parts[0]
      expect(firstPart).toBeDefined()
      expect(firstPart?._xenon_meta.ref).toContain('@prj/blueprint/dev-workflow#')
    })
  })

  describe('Work 转换', () => {
    test('Work → FrozenBlueprint 含多 task', () => {
      const result = mdastToKernel({
        entity: 'work',
        filePath: '.openxenon/works/feature-x/work.md',
        content: validWorkMd,
      })

      expect(result.frozen.name).toBe('feature-x')
      // 2 tasks → 2 parts
      expect(result.frozen.parts.length).toBe(2)
    })

    test('Work task deps → FrozenPart.deps', () => {
      const result = mdastToKernel({
        entity: 'work',
        filePath: '.openxenon/works/feature-x/work.md',
        content: validWorkMd,
      })

      const step2 = result.frozen.parts[1]
      expect(step2).toBeDefined()
      expect(step2?.deps).toContain('step1')
    })
  })

  describe('Task 转换', () => {
    test('Task → FrozenBlueprint 默认 1 part', () => {
      const taskMd = `---
entity: task
version: 0.3.0
name: step1
work: feature-x
---

# Task: step1`
      const result = mdastToKernel({
        entity: 'task',
        filePath: '.openxenon/works/feature-x/tasks/step1/task.md',
        content: taskMd,
      })

      expect(result.frozen.parts.length).toBe(1)
    })

    test('Task 多个 part → 多 FrozenPart', () => {
      // v0.3.0 canonical: ## Parts + ### 实例
      const taskMd = `---
entity: task
version: 0.3.0
name: register-member
work: feature-x
---

# Task: register-member

## Parts

### develop
- skill_context: 实现注册

### test
- skill_context: 写测试
`
      const result = mdastToKernel({
        entity: 'task',
        filePath: '.openxenon/works/feature-x/tasks/register-member/task.md',
        content: taskMd,
      })

      expect(result.frozen.parts.length).toBe(2)
    })
  })

  describe('Proof 转换', () => {
    test('Proof → FrozenBlueprint 只读', () => {
      const proofMd = `---
entity: proof
version: 0.3.0
name: feature-x
outcome: PASSED
---

# Proof: feature-x`
      const result = mdastToKernel({
        entity: 'proof',
        filePath: '.openxenon/proofs/feature-x/outcome.md',
        content: proofMd,
      })

      expect(result.frozen.name).toBe('feature-x')
      expect(result.frozen.parts.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('XenonMeta 一致性', () => {
    test('ref / resolved_from / content_hash / frozen_at 都存在', () => {
      const result = mdastToKernel({
        entity: 'blueprint',
        filePath: '.openxenon/blueprints/dev-workflow.md',
        content: validBlueprintMd,
      })

      // result.meta 是 first part 的 XenonMeta（不是 frozen.）
      expect(result.meta.ref).toBeTruthy()
      expect(result.meta.resolved_from).toBe('project')
      expect(result.meta.content_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.meta.frozen_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.meta.original_path).toBe('.openxenon/blueprints/dev-workflow.md')
    })

    test('result.meta 等于 first part 的 _xenon_meta', () => {
      const result = mdastToKernel({
        entity: 'domain',
        filePath: '.openxenon/domains/OrderContext.md',
        content: validDomainMd,
      })

      expect(result.meta).toBe(result.frozen.parts[0]?._xenon_meta)
    })

    test('frozen.frozen_at 存在（Blueprint 级）', () => {
      const result = mdastToKernel({
        entity: 'domain',
        filePath: '.openxenon/domains/OrderContext.md',
        content: validDomainMd,
      })

      expect(result.frozen.frozen_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('错误处理', () => {
    test('校验失败抛 MdastToKernelError', () => {
      expect(() =>
        mdastToKernel({
          entity: 'domain',
          filePath: 'invalid.md',
          content: '# No frontmatter',
        }),
      ).toThrow(MdastToKernelError)
    })

    test('MdastToKernelError 包含 entity 信息', () => {
      try {
        mdastToKernel({
          entity: 'blueprint',
          filePath: 'invalid.md',
          content: '# X',
        })
      } catch (err) {
        if (err instanceof MdastToKernelError) {
          expect(err.entity).toBe('blueprint')
        }
      }
    })
  })

  describe('性能', () => {
    test('convertTime ≥ 0', () => {
      const result = mdastToKernel({
        entity: 'domain',
        filePath: 'test.md',
        content: validDomainMd,
      })
      expect(result.convertTime).toBeGreaterThanOrEqual(0)
    })
  })
})
