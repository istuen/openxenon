/**
 * md-bridge/pipeline.test.ts — pipeline.ts 单元测试
 *
 * v0.3 阶段 1 T8 任务
 */

import { describe, expect, test } from 'bun:test'
import { runMdPipeline } from '../pipeline.js'

describe('md-bridge/pipeline', () => {
  describe('runMdPipeline 基础解析', () => {
    test('解析基础 Markdown', () => {
      const result = runMdPipeline({ content: '# Hello\n\nWorld' })
      expect(result.success).toBe(true)
      expect(result.mdast.type).toBe('root')
      expect(result.title).toBe('Hello')
      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
    })

    test('解析空内容', () => {
      const result = runMdPipeline({ content: '' })
      expect(result.success).toBe(true)
      expect(result.mdast.children).toHaveLength(0)
    })

    test('contentHash 一致性（相同输入产生相同 hash）', () => {
      const content = '# Test\n\ncontent'
      const r1 = runMdPipeline({ content })
      const r2 = runMdPipeline({ content })
      expect(r1.contentHash).toBe(r2.contentHash)
    })

    test('contentHash 唯一性（不同输入产生不同 hash）', () => {
      const r1 = runMdPipeline({ content: '# A' })
      const r2 = runMdPipeline({ content: '# B' })
      expect(r1.contentHash).not.toBe(r2.contentHash)
    })
  })

  describe('frontmatter 提取', () => {
    test('提取 YAML frontmatter', () => {
      const md = `---
entity: domain
version: 0.3.0
---

# Domain: OrderContext`
      const result = runMdPipeline({ content: md })
      expect(result.frontmatter.entity).toBe('domain')
      expect(result.frontmatter.version).toBe('0.3.0')
    })

    test('无 frontmatter 返回空对象', () => {
      const result = runMdPipeline({ content: '# No frontmatter' })
      expect(result.frontmatter).toEqual({})
    })

    test('frontmatter 字符串值（带引号）', () => {
      const md = `---
name: "OrderContext"
status: 'active'
---

# Title`
      const result = runMdPipeline({ content: md })
      expect(result.frontmatter.name).toBe('OrderContext')
      expect(result.frontmatter.status).toBe('active')
    })

    test('frontmatter 布尔值', () => {
      const md = `---
intent: true
archived: false
---

# Title`
      const result = runMdPipeline({ content: md })
      expect(result.frontmatter.intent).toBe(true)
      expect(result.frontmatter.archived).toBe(false)
    })

    test('frontmatter 注释行被跳过', () => {
      const md = `---
# 这是注释
entity: domain
---

# Title`
      const result = runMdPipeline({ content: md })
      expect(result.frontmatter.entity).toBe('domain')
    })
  })

  describe('Intent 容器指令提取', () => {
    test('提取 :::intent 块（list 形式）', () => {
      const md = `# Test

:::intent{#inv-1 type="invariant" scope="domain"}
- rule 1
- rule 2
:::`
      const result = runMdPipeline({ content: md })
      expect(result.intents).toHaveLength(1)
      expect(result.intents[0]?.name).toBe('intent')
      expect(result.intents[0]?.attributes.id).toBe('inv-1')
      expect(result.intents[0]?.attributes.type).toBe('invariant')
      expect(result.intents[0]?.attributes.scope).toBe('domain')
      expect(result.intents[0]?.content).toEqual(['rule 1', 'rule 2'])
    })

    test('提取 :::intent 块（paragraph 形式）', () => {
      const md = `# Test

:::intent{#term-1 type="term"}
Order 业务实体定义
:::`
      const result = runMdPipeline({ content: md })
      expect(result.intents).toHaveLength(1)
      expect(result.intents[0]?.content).toEqual(['Order 业务实体定义'])
    })

    test('多个 :::intent 块', () => {
      const md = `# Test

:::intent{#t1 type="term"}
Term 1
:::

Content

:::intent{#t2 type="ban"}
- ban 1
- ban 2
:::`
      const result = runMdPipeline({ content: md })
      expect(result.intents).toHaveLength(2)
      expect(result.intents[0]?.attributes.id).toBe('t1')
      expect(result.intents[1]?.attributes.id).toBe('t2')
    })

    test('无 :::intent 块返回空数组', () => {
      const result = runMdPipeline({ content: '# Test\n\nno intents' })
      expect(result.intents).toEqual([])
    })
  })

  describe('entity 推断', () => {
    test('从 frontmatter.entity 推断', () => {
      const md = `---
entity: blueprint
---

# Blueprint: X`
      const result = runMdPipeline({ content: md, entity: 'blueprint' })
      expect(result.entityType).toBe('blueprint')
    })

    test('从 input.entity 推断（fallback）', () => {
      const result = runMdPipeline({ content: '# X', entity: 'work' })
      expect(result.entityType).toBe('work')
    })

    test('未指定 entity 返回 null', () => {
      const result = runMdPipeline({ content: '# X' })
      expect(result.entityType).toBe(null)
    })
  })

  describe('错误处理', () => {
    test('content 为 null/undefined 抛错', () => {
      // @ts-expect-error - 测试运行时
      expect(() => runMdPipeline({ content: null })).toThrow()
    })
  })

  describe('文件路径透传', () => {
    test('filePath 在输出中保留', () => {
      const result = runMdPipeline({ content: '# X', filePath: '/tmp/test.md' })
      expect(result.filePath).toBe('/tmp/test.md')
    })
  })
})
