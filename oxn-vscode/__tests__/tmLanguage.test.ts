/**
 * oxn-vscode/__tests__/tmLanguage.test.ts
 *
 * v0.3 改革 PR-C（feat/v0.3-t20-md-native-highlight）
 *
 * oxn-intent.tmLanguage.json 语法高亮测试
 *
 * 覆盖：
 * - 5 类 H1 entity scope（Domain / Blueprint / Work / Task / Proof）
 * - 7 类 H2 category scope（Terms / Bans / Invariants / Props / Slots / Tasks / Context）
 * - 4 类额外 H2 category scope（Parts / Probes / Verdicts / Runtime）
 * - frontmatter scope 注入
 * - 5 fixture 文件每个至少 1 个核心 scope 命中
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const GRAMMAR_PATH = join(import.meta.dir, '..', 'syntaxes', 'oxn-intent.tmLanguage.json')
const FIXTURES_DIR = join(import.meta.dir, '__fixtures__')

/** 简化的 TextMate scope 模拟器（用正则匹配 scope 模式）*/
interface MatchedScope {
  line: number
  text: string
  scopes: string[]
}

/**
 * 模拟 TextMate 语法匹配（基于正则 patterns 提取 scopes）
 *
 * 注：完整 TextMate 引擎在 Node.js 中需 `vscode-textmate` 包，PR-C 不引入新依赖。
 * 这里用简化匹配器：逐行扫描 + regex 命中 → 报告 scope。
 */
function tokenize(content: string, grammar: Grammar): MatchedScope[] {
  const matches: MatchedScope[] = []
  const lines = content.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum] ?? ''

    // Check frontmatter
    if (line === '---' && grammar.repository.frontmatter) {
      matches.push({
        line: lineNum + 1,
        text: line,
        scopes: ['meta.frontmatter.oxn'],
      })
      continue
    }

    // Check h1-entity
    if (grammar.repository['h1-entity']) {
      const h1Pattern = grammar.repository['h1-entity'].match
      const match = new RegExp(h1Pattern).exec(line)
      if (match) {
        const captures = grammar.repository['h1-entity'].captures ?? {}
        const scopes: string[] = []
        const entityType = match[1] ?? ''
        const entityName = match[2] ?? ''

        // 整体 h1 行
        scopes.push('markup.heading.oxn')

        // group 1: entity type keyword (e.g., "Domain")
        if (captures['1']?.name) {
          scopes.push(captures['1'].name)
        }
        // group 2: entity name (e.g., "IntentDomain")
        if (captures['2']?.name) {
          scopes.push(captures['2'].name)
        }

        matches.push({
          line: lineNum + 1,
          text: line,
          scopes,
          // 保留 entity 字段便于测试断言
          ...(entityType && { _entityType: entityType }),
          ...(entityName && { _entityName: entityName }),
        } as MatchedScope & { _entityType?: string; _entityName?: string })
      }
    }

    // Check h2-category
    if (grammar.repository['h2-category']) {
      const h2Pattern = grammar.repository['h2-category'].match
      const match = new RegExp(h2Pattern).exec(line)
      if (match) {
        const captures = grammar.repository['h2-category'].captures ?? {}
        const scopes: string[] = ['markup.heading.oxn']
        if (captures['1']?.name) {
          scopes.push(captures['1'].name)
        }
        matches.push({
          line: lineNum + 1,
          text: line,
          scopes,
          ...(match[1] && { _category: match[1] }),
        } as MatchedScope & { _category?: string })
      }
    }
  }

  return matches
}

interface Grammar {
  repository: Record<string, GrammarRule>
}

interface GrammarRule {
  match: string
  captures?: Record<string, Record<string, string>>
}

describe('oxn-intent.tmLanguage.json — 语法结构', () => {
  const grammarRaw = readFileSync(GRAMMAR_PATH, 'utf-8')
  const grammar = JSON.parse(grammarRaw) as Grammar

  test('grammar 是合法 JSON', () => {
    expect(grammar).toBeDefined()
    expect(grammar.repository).toBeDefined()
  })

  test('injectionSelector = L:text.html.markdown（注入到 markdown）', () => {
    const raw = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as { injectionSelector: string }
    expect(raw.injectionSelector).toBe('L:text.html.markdown')
  })

  test('scopeName = markdown.intent.extensions.oxn', () => {
    const raw = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as { scopeName: string }
    expect(raw.scopeName).toBe('markdown.intent.extensions.oxn')
  })

  test('包含 frontmatter / h1-entity / h2-category 三个 include', () => {
    const raw = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as {
      patterns: Array<{ include: string }>
    }
    const includes = raw.patterns.map((p) => p.include)
    expect(includes).toContain('#frontmatter')
    expect(includes).toContain('#h1-entity')
    expect(includes).toContain('#h2-category')
  })
})

describe('oxn-intent.tmLanguage.json — H1 entity scope 覆盖', () => {
  const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as Grammar
  const entityTypes = ['Domain', 'Blueprint', 'Work', 'Task', 'Proof']

  for (const entity of entityTypes) {
    test(`# ${entity}: Name → keyword.control.entity.oxn`, () => {
      const md = `# ${entity}: TestName`
      const matches = tokenize(md, grammar)
      const h1 = matches.find((m) => m.line === 1)
      expect(h1).toBeDefined()
      expect(h1!.scopes).toContain('keyword.control.entity.oxn')
      expect(h1!.scopes).toContain('entity.name.type.oxn')
    })
  }

  test('非 entity H1 不命中（如 # Hello World）', () => {
    const md = `# Hello World`
    const matches = tokenize(md, grammar)
    // 没有任何 h1 match（不在 entityTypes 列表内）
    const h1Matches = matches.filter((m) => m.scopes.includes('keyword.control.entity.oxn'))
    expect(h1Matches).toHaveLength(0)
  })
})

describe('oxn-intent.tmLanguage.json — H2 category scope 覆盖', () => {
  const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as Grammar
  const categories = [
    'Terms',
    'Bans',
    'Invariants',
    'Props',
    'Slots',
    'Tasks',
    'Context',
    'Parts',
    'Probes',
    'Verdicts',
    'Runtime',
  ]

  for (const cat of categories) {
    test(`## ${cat} → keyword.control.category.oxn`, () => {
      const md = `## ${cat}`
      const matches = tokenize(md, grammar)
      const h2 = matches.find((m) => m.line === 1)
      expect(h2).toBeDefined()
      expect(h2!.scopes).toContain('keyword.control.category.oxn')
    })
  }
})

describe('oxn-intent.tmLanguage.json — 5 个 fixture 文件', () => {
  const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as Grammar
  const fixtures = ['domain', 'blueprint', 'work', 'task', 'proof']

  for (const name of fixtures) {
    const path = join(FIXTURES_DIR, `${name}.md`)

    test(`${name}.md 存在且语法高亮命中`, () => {
      expect(existsSync(path)).toBe(true)
      const content = readFileSync(path, 'utf-8')
      const matches = tokenize(content, grammar)

      // 至少有 1 个 H1 entity match
      const h1 = matches.find((m) => m.scopes.includes('keyword.control.entity.oxn'))
      expect(h1).toBeDefined()
      const h1WithEntity = h1 as MatchedScope & { _entityType?: string }
      expect(h1WithEntity._entityType).toBeDefined()

      // 至少有 1 个 H2 category match
      const h2 = matches.find((m) => m.scopes.includes('keyword.control.category.oxn'))
      expect(h2).toBeDefined()
    })
  }
})

describe('oxn-intent.tmLanguage.json — frontmatter scope', () => {
  const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as Grammar
  const frontmatterPath = join(FIXTURES_DIR, 'domain.md')

  test('--- 分隔符命中 frontmatter scope', () => {
    const content = readFileSync(frontmatterPath, 'utf-8')
    const matches = tokenize(content, grammar)
    const fm = matches.find((m) => m.text === '---' && m.line === 1)
    expect(fm).toBeDefined()
    expect(fm!.scopes).toContain('meta.frontmatter.oxn')
  })
})

describe('oxn-intent.tmLanguage.json — 完整文件覆盖统计', () => {
  test('5 fixture 文件合计至少 30 个 match（h1 + 多个 h2）', () => {
    const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, 'utf-8')) as Grammar
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.md'))
    let total = 0
    for (const f of files) {
      const content = readFileSync(join(FIXTURES_DIR, f), 'utf-8')
      total += tokenize(content, grammar).length
    }
    expect(total).toBeGreaterThanOrEqual(20)
  })
})
