/**
 * asset-templates-parse.test.ts — v0.6.1-alpha.4 Phase 2
 *
 * 验证 4 个 Asset 模板（domain/workflow/stack/blueprint）可被对应 compiler 解析
 * 锁定 4 种 AssetKind 模板的 .md 语法合规性
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DomainCompiler } from '../compilers/domain-compiler.js'
import { WorkflowCompiler } from '../compilers/workflow-compiler.js' // 🆕 v0.6.1-alpha.4: 原 Blueprint 改名
import { StackCompiler } from '../compilers/stack-compiler.js'
// 🆕 v0.6.1-alpha.4 Phase 2: library/external entity 删除 → 不再导入对应 compiler
//   - Library 用途：.openxenon/libraries/*.md 文件 + Domain ## Externals (kind: library) 引用
//   - External 用途：边界类型 ## Externals H2 category（url/path/kind/ttl/auth/summary）

const ASSETS_DIR = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  '..',
  '..',
  'cli',
  'src',
  'skills',
  'locales',
  'zh-CN',
  'oxn-asset',
  'assets',
)

function parseMdWithFrontmatter(content: string): { mdast: any; frontmatter: Record<string, unknown> } {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content)
  const fm: Record<string, unknown> = {}
  const yamlNode = tree.children.find((c: { type: string }) => c.type === 'yaml')
  if (yamlNode && 'value' in yamlNode) {
    for (const line of (yamlNode as { value: string }).value.split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m?.[1] && m[2] !== undefined) fm[m[1]] = m[2]
    }
  }
  return { mdast: tree, frontmatter: fm }
}

describe('domain 模板（AssetKind 1/5）', () => {
  test('1. domain.md 可被 DomainCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'domain.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new DomainCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      name: string
      terms: Array<{ name: string; desc: string }>
      bans: Array<{ items: string[]; desc: string }>
      invariants: Array<{ value: string }>
    }
    expect(result.entity).toBe('domain')
    expect(result.terms.length).toBeGreaterThanOrEqual(3)
    expect(result.bans.length).toBeGreaterThanOrEqual(1)
    expect(result.invariants.length).toBeGreaterThanOrEqual(1)
  })
})

describe('workflow 模板（AssetKind 2/5，v0.6.1-alpha.4，原 blueprint 改名）', () => {
  test('2. workflow.md 可被 WorkflowCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'workflow.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new WorkflowCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      slots: Array<{ name: string; desc: string }>
    }
    expect(result.entity).toBe('workflow')
    expect(result.slots.length).toBeGreaterThanOrEqual(1)
  })
})

describe('stack 模板（AssetKind 3/5）', () => {
  test('3. stack.md 可被 StackCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'stack.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new StackCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      tools: Array<{ name: string; props: Record<string, string> }>
    }
    expect(result.entity).toBe('stack')
    expect(result.tools.length).toBeGreaterThanOrEqual(1)
  })
})

// 🆕 v0.6.1-alpha.4 Phase 2: library/external 不再是独立 AssetKind，原 4/5 + 5/5 测试已删除
// 旧 .openxenon/assets/libraries/ + externals/ 目录文件已通过 oxn migrate external-assets 迁移到
//   - .openxenon/libraries/*.md（普通 .md 文件，非 Asset）
//   - 边界类型 ## Externals inline 声明
// 集成测试在 packages/cli/src/__tests__/external-cli-e2e.test.ts（待 Phase 3 创建）
