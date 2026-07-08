/**
 * work-templates-parse.test.ts — 验证 4 个 work 模板可被 WorkCompiler.parse() 直接解析
 *
 * v0.6.1-alpha.1 + ADR-0039：
 * - .md 模板**就是** work.oxn 的 .md 表达（不是 OXL 代码块文档）
 * - 模板应被 WorkCompiler.parse() 直接读取，产生与 .oxn 等价的业务对象
 * - 此测试锁定模板语法合规性
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WorkCompiler } from '../compilers/work-compiler.js'

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
  'oxn-work',
  'assets',
)

const TEMPLATES = [
  { file: 'work-explore.md', name: 'explore-dsl', expectedTaskCount: 1 },
  { file: 'work-develop.md', name: 'develop-member', expectedTaskCount: 1 },
  { file: 'work-fix.md', name: 'fix-issue', expectedTaskCount: 4 },
  { file: 'work-onboarding.md', name: 'NewUserOnboarding', expectedTaskCount: 2 },
]

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

describe('assets/work-*.md 模板语法合规性（ADR-0039）', () => {
  for (const t of TEMPLATES) {
    test(`${t.file} 可被 WorkCompiler.parse() 直接解析`, () => {
      const path = join(ASSETS_DIR, t.file)
      const content = readFileSync(path, 'utf-8')
      const { mdast, frontmatter } = parseMdWithFrontmatter(content)

      const compiler = new WorkCompiler()
      const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
        entity: string
        name: string
        version: string
        context: { goal: string; max_iterations: number; constraints: string[] }
        tasks: Array<{
          name: string
          blueprint: string
          domain: string
          parts: Array<{ name: string; skill_context: string }>
        }>
      }

      expect(result.entity).toBe('work')
      expect(result.name).toBe(t.name)
      expect(result.context.goal).toBeTruthy()
      expect(result.context.max_iterations).toBeGreaterThan(0)
      expect(result.tasks.length).toBe(t.expectedTaskCount)
      // 每个 task 应至少 1 个 part
      for (const task of result.tasks) {
        expect(task.parts.length).toBeGreaterThanOrEqual(1)
        expect(task.parts[0]?.skill_context).toBeTruthy()
      }
    })
  }

  test('H1 格式：# Work: <name>（不是 # work-develop.oxn 模板）', () => {
    const path = join(ASSETS_DIR, 'work-develop.md')
    const content = readFileSync(path, 'utf-8')
    expect(content).toMatch(/^# Work: develop-member$/m)
    expect(content).not.toMatch(/^# work-develop\.oxn 模板/m)
  })

  test('H2 分类白名单：Context / Tasks（不是"模板内容"/"使用方法"）', () => {
    const path = join(ASSETS_DIR, 'work-develop.md')
    const content = readFileSync(path, 'utf-8')
    expect(content).toMatch(/^## Context$/m)
    expect(content).toMatch(/^## Tasks$/m)
    expect(content).not.toMatch(/^## 模板内容$/m)
    expect(content).not.toMatch(/^## 使用方法$/m)
  })

  test('不用 OXL 代码块包裹内容（模板本身是 .md，不是关于 .oxn 的文档）', () => {
    for (const t of TEMPLATES) {
      const content = readFileSync(join(ASSETS_DIR, t.file), 'utf-8')
      expect(content).not.toMatch(/```oxn/)
    }
  })
})
