/**
 * md-bridge/__tests__/oxl-md-decompiler.test.ts — .oxn → .md 反向编译器测试
 *
 * v0.3 改革 PR-B（feat/v0.3-t19-md-native-migrate）
 *
 * 覆盖：
 * - Domain: 全字段（name/description/terms/bans/invariants）
 * - Blueprint: name/props/slots
 * - Work: name/context/tasks
 * - 错误：空 .oxn / 解析失败
 * - Hash 一致性
 * - 真实 fixtures：align-domain.oxn
 *
 * v0.3 PR-B 关键变化：
 * - 输出格式从 `:::intent{...}` 容器指令 → 纯 MD（H1/H2/H3 + 嵌套列表）
 * - 通过 EntityRegistry 路由到 5 个 compiler 实现
 * - 旧 `:::intent{...}` 解析期抛 E_MD_DEPRECATED_SYNTAX
 */

import { describe, expect, test } from 'bun:test'
import { compileOxnToMd, DecompilerParseError } from '../oxl-md-decompiler.js'
import { computeContentHash } from '../oxl-md-source-hash.js'
import { getEntityCompiler } from '../entity-registry.js'
import '../compilers/index.js' // 副作用：注册 5 个 compiler
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ========================
// 测试 fixtures
// ========================

const SIMPLE_DOMAIN_OXN = `domain "OrderContext" {
  description = "Order 业务实体上下文"

  term {
    "Order":     "Order 业务实体"
    "OrderItem": "Order 内的商品项"
  }

  ban {
    "OrderDraft", "OrderPending"
  }

  invariant { "Order 必须有唯一 ID" }
  invariant { "OrderItem 必须有 price > 0" }
}
`

const DOMAIN_WITH_T11_INVARIANTS = `domain "AlignDomain" {
  description = "Align 轴统一词汇"

  term {
    "Work": "一次任务执行的沙盒"
    "Task": "Work 内的具体步骤"
  }

  ban {
    "Job", "TaskRun", "Execution"
  }

  invariant { "Work 必须经过 validate 才能 run" }
  invariant { script = "exit 0 = pass, exit 1 = fail"; scope = "work"; }
  invariant { manual = "需要人工 review" }
}
`

const EMPTY_DOMAIN_OXN = `domain "EmptyDomain" {
}
`

const SIMPLE_BLUEPRINT_OXN = `blueprint "dev-workflow" {
  version = 1
  description = "开发工作流"

  prop "feature" {
    type = string;
  }

  slot "develop" {
    deps = ["test"]
  }

  slot "test" {
  }
}
`

const RICH_BLUEPRINT_OXN = `blueprint "rich-bp" {
  version = 2
  description = "rich 测试：prop 多 type + observe + version"

  prop "timeout" {
    type = number;
    default = 60000;
  }

  prop "strict" {
    type = boolean;
    default = true;
  }

  prop "name" {
    type = string;
    required = true;
  }

  prop "tags" {
    type = list<string>;
  }

  slot "analyze" {
    deps = []
    observe = ["fs-exists", "lint-check"]
  }

  slot "implement" {
    deps = ["analyze"]
    observe = ["ts-compiles", "test-pass"]
  }
}
`

const SIMPLE_WORK_OXN = `work "feature-x" {
  context {
    goal = "实现 X 功能";
    loop_policy { max_iterations = 3; }
  }
  domain "X" ref "@prj/domains/X";
  blueprint "Y" ref "@prj/blueprints/Y";

  task "step1" {
    domain "X"
    blueprint "Y"
    part "develop" {
      skill_context = "实现 X 的 skill context"
    }
  }
}
`

const ALIGN_DOMAIN_PATH = join(process.cwd(), '.openxenon/domains/align-domain.oxn')

// ========================
// Tests
// ========================

describe('oxl-md-decompiler: Domain', () => {
  test('1. basic domain compiles to .md', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.entity).toBe('domain')
    expect(result.name).toBe('OrderContext')
    expect(result.md).toContain('# Domain: OrderContext')
    expect(result.md).toContain('Order 业务实体上下文')
  })

  test('2. terms as ### <name> under ## Terms (纯 MD 格式, no - name: redundancy)', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.md).toContain('## Terms')
    expect(result.md).toContain('### Order')
    expect(result.md).toContain('### OrderItem')
    // canonical: H3 是 name, 不再写 - name: <h3>
    expect(result.md).not.toMatch(/^- name: Order$/m)
    expect(result.md).not.toMatch(/^- name: OrderItem$/m)
    expect(result.md).toContain('Order 业务实体')
    expect(result.md).toContain('Order 内的商品项')
    // 不再含 :::intent
    expect(result.md).not.toContain(':::intent')
  })

  test('3. bans as ### forbidden-constructs under ## Bans', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.md).toContain('## Bans')
    expect(result.md).toContain('### forbidden-constructs')
    expect(result.md).toMatch(/OrderDraft.*OrderPending/s)
    expect(result.md).not.toContain(':::intent')
  })

  test('4. invariants as ### inv-* under ## Invariants', async () => {
    const result = await compileOxnToMd(DOMAIN_WITH_T11_INVARIANTS, { entity: 'domain' })
    expect(result.md).toContain('## Invariants')
    expect(result.md).toMatch(/### inv-/)
    expect(result.md).toMatch(/- value:.*Work 必须经过 validate/)
    expect(result.md).toMatch(/- script:.*exit 0 = pass/)
    expect(result.md).toMatch(/- scope: work/)
    expect(result.md).toMatch(/- manual: 需要人工 review/)
    expect(result.md).not.toContain(':::intent')
  })

  test('5. frontmatter contains entity + name + version', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.md).toMatch(/^---\nentity: domain\nversion: 0\.3\.0\nname: OrderContext\n/)
  })

  test('6. contentHash is SHA-256 of md content', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    const expectedHash = computeContentHash(result.md)
    expect(result.contentHash).toBe(expectedHash)
  })

  test('7. empty domain compiles without crash', async () => {
    const result = await compileOxnToMd(EMPTY_DOMAIN_OXN, { entity: 'domain' })
    expect(result.name).toBe('EmptyDomain')
    expect(result.md).toContain('# Domain: EmptyDomain')
    // No terms/bans/invariants sections
    expect(result.md).not.toContain('## Terms')
    expect(result.md).not.toContain('## Bans')
    expect(result.md).not.toContain('## Invariants')
  })

  test('8. frontmatter can be disabled', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, {
      entity: 'domain',
      frontmatter: false,
    })
    expect(result.md.startsWith('---\nentity:')).toBe(false)
    expect(result.md.startsWith('# Domain: OrderContext')).toBe(true)
  })

  test('9. custom version in frontmatter', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, {
      entity: 'domain',
      version: '0.4.0',
    })
    expect(result.md).toContain('version: 0.4.0')
  })

  test('10. auto-detect entity type when not specified', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN)
    expect(result.entity).toBe('domain')
    expect(result.name).toBe('OrderContext')
  })
})

describe('oxl-md-decompiler: Blueprint', () => {
  test('11. basic blueprint compiles to .md', async () => {
    const result = await compileOxnToMd(SIMPLE_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.entity).toBe('blueprint')
    expect(result.name).toBe('dev-workflow')
    expect(result.md).toContain('# Blueprint: dev-workflow')
    expect(result.md).toContain('开发工作流')
  })

  test('12. slots as ### <name> under ## Slots (含 deps)', async () => {
    const result = await compileOxnToMd(SIMPLE_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toContain('## Slots')
    expect(result.md).toContain('### develop')
    expect(result.md).toContain('### test')
    expect(result.md).toMatch(/### develop[\s\S]*- deps:[\s\S]*- test/)
    expect(result.md).not.toContain(':::intent')
  })

  test('13. props as ### <name> under ## Props', async () => {
    const result = await compileOxnToMd(SIMPLE_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toContain('## Props')
    expect(result.md).toContain('### feature')
    expect(result.md).toMatch(/- type: string/)
    expect(result.md).not.toContain(':::intent')
  })

  test('14. prop.type preserved as number/boolean/string/list<string>', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    // 4 个 prop 都应有正确的 - type: 行
    expect(result.md).toMatch(/### timeout[\s\S]*- type: number/)
    expect(result.md).toMatch(/### strict[\s\S]*- type: boolean/)
    expect(result.md).toMatch(/### name[\s\S]*- type: string/)
    expect(result.md).toMatch(/### tags[\s\S]*- type: list<string>/)
  })

  test('15. prop.default preserved as - default: <value>', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/- type: number[\s\S]*- default: 60000/)
    expect(result.md).toMatch(/- type: boolean[\s\S]*- default: true/)
  })

  test('16. prop.required preserved as - required: true', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/### name[\s\S]*- required: true/)
  })

  test('17. slot.observe preserved as - observe: list', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toContain('### analyze')
    expect(result.md).toContain('### implement')
    // observe 是数组
    expect(result.md).toMatch(/### analyze[\s\S]*- observe:[\s\S]*- fs-exists[\s\S]*- lint-check/)
    expect(result.md).toMatch(/### implement[\s\S]*- observe:[\s\S]*- ts-compiles[\s\S]*- test-pass/)
  })

  test('18. blueprint.version preserved in frontmatter (no body version line)', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    // v0.3 PR-B 改革：version 只在 frontmatter，从 .oxn 的 version 字段读取
    expect(result.md).toMatch(/^---\nentity: blueprint\nversion: 2\nname: rich-bp\n/)
    expect(result.md).not.toContain('Blueprint version:')
  })

  test('19. real blueprint fixture (add-cli-subcommand.oxn) converts', async () => {
    const path = join(process.cwd(), '.openxenon/blueprints/add-cli-subcommand.oxn')
    if (!existsSync(path)) return
    const oxn = readFileSync(path, 'utf-8')
    const result = await compileOxnToMd(oxn, { entity: 'blueprint' })
    expect(result.name).toBe('add-cli-subcommand')
    // 4 个 slot 都有 observe
    expect(result.md).toContain('### analyze')
    expect(result.md).toContain('### implement')
    expect(result.md).toContain('### verify')
  })
})

describe('oxl-md-decompiler: Work', () => {
  test('14. basic work compiles to .md', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.entity).toBe('work')
    expect(result.name).toBe('feature-x')
    expect(result.md).toContain('# Work: feature-x')
  })

  test('15. work context as ## Context with ### primary + goal + max_iterations', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.md).toContain('## Context')
    expect(result.md).toMatch(/### primary[\s\S]*- goal: 实现 X 功能[\s\S]*- max_iterations: 3/)
    expect(result.md).not.toContain(':::intent')
  })

  test('16. work tasks as ## Tasks with ### step1 (含嵌套 part)', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.md).toContain('## Tasks')
    expect(result.md).toContain('### step1')
    expect(result.md).toMatch(/- blueprint: Y/)
    expect(result.md).toMatch(/- domain: X/)
    expect(result.md).toMatch(/- part: develop[\s\S]*- skill_context: 实现 X 的 skill context/)
  })
})

describe('oxl-md-decompiler: Error Handling', () => {
  test('17. throws on empty .oxn', async () => {
    await expect(compileOxnToMd('', { entity: 'domain' })).rejects.toThrow(DecompilerParseError)
  })

  test('18. throws on malformed .oxn', async () => {
    const malformed = `domain "X" { term { "Foo" "missing colon" }`
    await expect(compileOxnToMd(malformed, { entity: 'domain' })).rejects.toThrow(DecompilerParseError)
  })
})

describe('oxl-md-decompiler: Real fixture', () => {
  test('19. align-domain.oxn compiles successfully', async () => {
    if (!existsSync(ALIGN_DOMAIN_PATH)) {
      return // Skip if fixture not present
    }
    const oxn = readFileSync(ALIGN_DOMAIN_PATH, 'utf-8')
    const result = await compileOxnToMd(oxn, { entity: 'domain' })
    expect(result.name).toBe('AlignDomain')
    expect(result.md).toContain('# Domain: AlignDomain')
    expect(result.md).toContain('## Terms')
    expect(result.md).toContain('## Bans')
    expect(result.md).toContain('## Invariants')
    // 28 unique term names
    expect(result.md.match(/^### \S+$/gm)?.length).toBeGreaterThanOrEqual(25)
  })
})

describe('oxl-md-decompiler: Round-trip via EntityRegistry', () => {
  test('20. compile → decompile → parse (native path) stable', async () => {
    // Take a .oxn, decompile to .md, parse via EntityRegistry, verify name
    const oxn = SIMPLE_DOMAIN_OXN
    const decompiled = await compileOxnToMd(oxn, { entity: 'domain' })
    // 解析用 EntityRegistry.get('domain').parse()（PR-B 新路径）
    const compiler = getEntityCompiler('domain')
    const { unified } = await import('unified')
    const remarkParseMod = await import('remark-parse')
    const remarkFrontmatterMod = await import('remark-frontmatter')
    const processor = unified()
      .use(remarkFrontmatterMod.default)
      .use(remarkFrontmatterMod.default ? { settings: {} } : {})
      .use(remarkParseMod.default)
    void processor // 占位
    // 直接用 extractHeadings + extractListFields 解析 mdast
    const tree = parseMdSimple(decompiled.md)
    // 通过 compiler.parse() 验证
    const frontmatter = extractFrontmatter(decompiled.md)
    const result = compiler.parse({ mdast: tree, frontmatter, options: { allowLegacyDirective: true } }) as {
      terms: Array<{ name: string; desc: string }>
    }
    expect(result.terms.length).toBeGreaterThanOrEqual(1)
    // 至少一个 term 应是 Order 或 OrderItem
    const names = result.terms.map((t) => t.name)
    expect(names.some((n) => n === 'Order' || n === 'OrderItem')).toBe(true)
  })

  test('21. parse via EntityRegistry preserves key fields', async () => {
    const oxn = SIMPLE_BLUEPRINT_OXN
    const md = await compileOxnToMd(oxn, { entity: 'blueprint' })
    const compiler = getEntityCompiler('blueprint')
    const tree = parseMdSimple(md.md)
    const frontmatter = extractFrontmatter(md.md)
    const result = compiler.parse({ mdast: tree, frontmatter }) as {
      props: Array<{ name: string; type: string }>
      slots: Array<{ name: string; deps: string[] }>
    }
    expect(result.props.some((p) => p.name === 'feature')).toBe(true)
    expect(result.slots.some((s) => s.name === 'develop')).toBe(true)
    expect(result.slots.find((s) => s.name === 'develop')?.deps).toContain('test')
  })
})

// ========================
// 测试辅助函数
// ========================

import type { Root } from 'mdast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'

/** 简单 MD → mdast 解析（不引入 remark-directive）*/
function parseMdSimple(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

/** 简单 YAML 解析 frontmatter */
function extractFrontmatter(md: string): Record<string, unknown> {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch || !fmMatch[1]) return {}
  const result: Record<string, unknown> = {}
  for (const line of fmMatch[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (value === 'true') result[key] = true
    else if (value === 'false') result[key] = false
    else if (/^["'].*["']$/.test(value)) result[key] = value.slice(1, -1)
    else result[key] = value
  }
  return result
}
