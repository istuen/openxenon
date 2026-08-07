// =============================================================================
// stack-transformer.test.ts — v0.7.4 stack-operation-followup P3
// extractStackIR — Stack md-pipeline transformer（替代 parseStackTools 轻量 regex）
//
// 覆盖：
//   1. 单 tool 单 operation → 正确抽取
//   2. 多 tool 混合（有/无 operations）
//   3. multiline - desc: | YAML block scalar
//   4. operation command 含引号（`"bun test"`）正确解析
//   5. operation 含 em-dash desc
//   6. frontmatter 提取 name / version / description
//   7. 无 Tools 段 → tools=[]
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { extractStackIR } from '../transformers/stack'
import { parseMarkdown } from '../utils'

function parseStack(content: string) {
  const { tree, frontmatter } = parseMarkdown(content)
  return extractStackIR(tree, frontmatter as Record<string, unknown>)
}

const SAMPLE_STACK = `---
entity: stack
version: 0.1.0
name: oxn-stack
abstract: Project technical stack
---

# Stack: oxn-stack

## Tools

### bun-test
- command: "bun test"
- role: 测试 runner
- operations:
  - test: "bun test" — 全量测试
  - test-filtered: "bun test --filter $PATTERN" — 按过滤器跑

### biome
- config: "biome.json"
- role: 格式 + 风格
- desc: |
  Biome 是项目主用
  formatter/linter 工具。
- operations:
  - check: "bun run check" — biome 全量 lint
  - format: "bun run format" — biome format

### lefthook
- config: "lefthook.yml"
- role: pre-commit + pre-push
`

describe('extractStackIR — v0.7.4 stack-operation-followup P3', () => {
  test('基本抽取 — name/version/tools', () => {
    const ir = parseStack(SAMPLE_STACK)
    expect(ir.entity).toBe('stack')
    expect(ir.name).toBe('oxn-stack')
    expect(ir.version).toBe('0.1.0')
    expect(ir.tools).toHaveLength(3)
  })

  test('单 tool + 多 operations — 验证 name/command/desc 解析', () => {
    const ir = parseStack(SAMPLE_STACK)
    const bunTest = ir.tools.find((t) => t.name === 'bun-test')
    expect(bunTest).toBeDefined()
    expect(bunTest!.command).toBe('bun test')
    expect(bunTest!.role).toBe('测试 runner')
    expect(bunTest!.operations).toHaveLength(2)
    expect(bunTest!.operations![0]).toEqual({
      name: 'test',
      command: 'bun test',
      desc: '全量测试',
    })
    expect(bunTest!.operations![1]).toEqual({
      name: 'test-filtered',
      command: 'bun test --filter $PATTERN',
      desc: '按过滤器跑',
    })
  })

  test('operation command 含引号 → 正确剥离', () => {
    const ir = parseStack(SAMPLE_STACK)
    const bunTest = ir.tools.find((t) => t.name === 'bun-test')!
    expect(bunTest.operations![0]!.command).not.toContain('"')
  })

  test('multiline - desc: | → 正确合并多行', () => {
    const ir = parseStack(SAMPLE_STACK)
    const biome = ir.tools.find((t) => t.name === 'biome')!
    expect(biome.desc).toContain('Biome 是项目主用')
    expect(biome.desc).toContain('formatter/linter')
  })

  test('biome 含 2 operations — check + format', () => {
    const ir = parseStack(SAMPLE_STACK)
    const biome = ir.tools.find((t) => t.name === 'biome')!
    expect(biome.operations).toHaveLength(2)
    expect(biome.operations!.map((o) => o.name)).toEqual(['check', 'format'])
  })

  test('无 operations 的 tool（lefthook）→ operations 字段缺省', () => {
    const ir = parseStack(SAMPLE_STACK)
    const lefthook = ir.tools.find((t) => t.name === 'lefthook')!
    expect(lefthook.operations).toBeUndefined()
  })

  test('无 Tools 段 → tools=[]', () => {
    const empty = `---
entity: stack
version: 0.1.0
name: empty-stack
---

# Stack: empty-stack
`
    const ir = parseStack(empty)
    expect(ir.tools).toEqual([])
  })

  test('frontmatter name 缺失 → 解析为 empty string', () => {
    const noFm = `# Stack: x\n\n## Tools\n\n### y\n- command: "cmd"\n`
    const ir = parseStack(noFm)
    expect(ir.name).toBe('')
    expect(ir.tools).toHaveLength(1)
  })

  test('单 tool 无 operation 无 desc → 只抽取 name', () => {
    const minimal = `---
entity: stack
version: 0.1.0
name: minimal
---

# Stack: minimal

## Tools

### y
- command: "cmd"
`
    const ir = parseStack(minimal)
    expect(ir.tools[0]?.name).toBe('y')
    expect(ir.tools[0]?.command).toBe('cmd')
    expect(ir.tools[0]?.operations).toBeUndefined()
  })
})
