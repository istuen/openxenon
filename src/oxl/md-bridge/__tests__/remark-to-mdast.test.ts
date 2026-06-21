/**
 * md-bridge/remark-to-mdast.test.ts — T3 单元测试
 *
 * v0.3 阶段 1 T8 任务
 */

import { describe, expect, test } from 'bun:test'
import { remarkToMdast, parseDomainMd, parseBlueprintMd, parseWorkMd, MdastParseError } from '../remark-to-mdast.js'

describe('md-bridge/remark-to-mdast', () => {
  describe('remarkToMdast 语义提取', () => {
    test('提取 title', () => {
      const r = remarkToMdast({ content: '# Hello World' })
      expect(r.title).toBe('Hello World')
    })

    test('提取二级标题', () => {
      const md = `# H1
## H2-a
## H2-b
### H3`
      const r = remarkToMdast({ content: md })
      expect(r.headings).toHaveLength(3)
      expect(r.headings[0]?.depth).toBe(2)
      expect(r.headings[1]?.depth).toBe(2)
      expect(r.headings[2]?.depth).toBe(3)
    })

    test('统计段落/列表/代码块', () => {
      const md = `# Title
paragraph 1
- item 1
- item 2
\`\`\`code
\`\`\`
paragraph 2`
      const r = remarkToMdast({ content: md })
      expect(r.paragraphCount).toBe(2)
      expect(r.listCount).toBe(1)
      expect(r.codeBlockCount).toBe(1)
    })
  })

  describe('parseDomainMd', () => {
    test('解析标准 Domain', () => {
      const md = `---
entity: domain
version: 0.3.0
name: OrderContext
---

# Domain: OrderContext

:::intent{#order-term type="term" scope="domain"}
Order 业务实体
:::

## Term: Order
| 属性 | 说明 |
| id | 唯一标识 |
`
      const r = parseDomainMd(md)
      expect(r.name).toBe('OrderContext')
      expect(r.title).toBe('Domain: OrderContext')
      expect(r.blocks.terms).toHaveLength(1)
      expect(r.blocks.terms[0]?.attributes.id).toBe('order-term')
      expect(r.blocks.bans).toHaveLength(0)
      expect(r.blocks.invariants).toHaveLength(0)
    })

    test('解析含 term/ban/invariant 的 Domain', () => {
      const md = `---
entity: domain
version: 0.3.0
---

# Domain: Mixed

:::intent{#t1 type="term"}
Term 1
:::

:::intent{#b1 type="ban"}
- ban 1
- ban 2
:::

:::intent{#i1 type="invariant"}
- inv 1
:::
`
      const r = parseDomainMd(md)
      expect(r.blocks.terms).toHaveLength(1)
      expect(r.blocks.bans).toHaveLength(1)
      expect(r.blocks.invariants).toHaveLength(1)
    })

    test('Domain name 提取（从 title）', () => {
      const r = parseDomainMd('# Domain: MyDomain\n\n:::intent{...}\n- x\n:::')
      expect(r.name).toBe('MyDomain')
    })

    test('Domain 无 title 返回空 name', () => {
      const r = parseDomainMd('no title here')
      expect(r.name).toBe('')
    })
  })

  describe('parseBlueprintMd', () => {
    test('解析标准 Blueprint', () => {
      const md = `---
entity: blueprint
version: 0.3.0
---

# Blueprint: dev-workflow

:::intent{#input-name type="prop" dataType="string"}
- name: input
- type: string
:::

:::intent{#slot-1 type="slot" deps="[]"}
- skill: develop
:::

:::intent{#probe-1 type="probe" slot="slot-1"}
- type: shell-exec
- command: bun test
:::
`
      const r = parseBlueprintMd(md)
      expect(r.name).toBe('dev-workflow')
      expect(r.props).toHaveLength(1)
      expect(r.slots).toHaveLength(1)
      expect(r.probes).toHaveLength(1)
    })
  })

  describe('parseWorkMd', () => {
    test('解析 Work（含 tasks）', () => {
      const md = `---
entity: work
version: 0.3.0
---

# Work: feature-x

:::intent{#ctx-1 type="context" goal="实现 X" max_iterations="3"}
- 实现 X 功能
:::

:::intent{#t1 type="task" deps="[]"}
- name: step1
:::

:::intent{#t2 type="task" deps="step1"}
- name: step2
:::
`
      const r = parseWorkMd(md)
      expect(r.name).toBe('feature-x')
      expect(r.contexts).toHaveLength(1)
      expect(r.tasks).toHaveLength(2)
    })
  })

  describe('错误处理', () => {
    test('解析失败抛 MdastParseError（直接构造）', () => {
      // 直接构造 MdastParseError 测试继承
      const err = new MdastParseError('test error', 10, 5, 'E_MD_INVALID_SYNTAX')
      expect(err).toBeInstanceOf(MdastParseError)
      expect(err.message).toBe('test error')
      expect(err.line).toBe(10)
      expect(err.column).toBe(5)
      expect(err.code).toBe('E_MD_INVALID_SYNTAX')
    })

    test('MdastParseError 是 Error 子类', () => {
      const err = new MdastParseError('test')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('MdastParseError')
    })
  })
})
