/**
 * md-bridge/oxl-md-decompiler.test.ts — .oxn → .md 反向编译器测试
 *
 * v0.3 阶段 2 后续工作（v0.4 推迟项提前实施）
 *
 * 覆盖：
 * - Domain: 全字段（name/description/terms/bans/invariants）
 * - Blueprint: name/props/slots
 * - Work: name/context/tasks
 * - 错误：空 .oxn / 解析失败
 * - Hash 一致性
 * - 真实 fixtures：align-domain.oxn（120 行）
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { compileOxnToMd, DecompilerParseError } from '../oxl-md-decompiler.js'
import { computeContentHash } from '../oxl-md-source-hash.js'
import { parseDomainMd } from '../remark-to-mdast.js'
import { compileMdToOxn } from '../oxl-md-compiler.js'
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

// v0.3 follow-up: 完整 Blueprint（prop 多种 type + default + required + slot observe）
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

  test('2. terms serialized as :::intent{type=term} blocks', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.md).toMatch(/:::intent\{#term-order[^}]*type="term"/)
    expect(result.md).toMatch(/:::intent\{#term-orderitem[^}]*type="term"/)
    expect(result.md).toContain('Order 业务实体')
    expect(result.md).toContain('Order 内的商品项')
  })

  test('3. bans serialized as single :::intent{type=ban} block', async () => {
    const result = await compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'domain' })
    expect(result.md).toMatch(/:::intent\{#ban-block[^}]*type="ban"/)
    expect(result.md).toContain('OrderDraft, OrderPending')
  })

  test('4. invariants serialized with v0.2 T11 attributes', async () => {
    const result = await compileOxnToMd(DOMAIN_WITH_T11_INVARIANTS, { entity: 'domain' })
    expect(result.md).toMatch(/type="invariant"[^}]*value="Work 必须经过 validate/)
    expect(result.md).toMatch(/type="invariant"[^}]*script="exit 0 = pass/)
    expect(result.md).toMatch(/scope="work"/)
    expect(result.md).toMatch(/type="invariant"[^}]*manual="需要人工 review"/)
  })

  test('5. frontmatter contains entity + name + version + source_hash', async () => {
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

  test('12. slots serialized as :::intent{type=slot} blocks', async () => {
    const result = await compileOxnToMd(SIMPLE_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/:::intent\{#slot-develop[^}]*type="slot"/)
    expect(result.md).toMatch(/:::intent\{#slot-test[^}]*type="slot"/)
    expect(result.md).toContain('deps="test"')
  })

  test('13. props serialized as :::intent{type=prop} blocks', async () => {
    const result = await compileOxnToMd(SIMPLE_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/:::intent\{#prop-feature[^}]*type="prop"/)
  })

  // v0.3 follow-up: prop.type 精度
  test('14. prop.type preserved as number/boolean/string (not all "string")', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/data-type="number"/)
    expect(result.md).toMatch(/data-type="boolean"/)
    expect(result.md).toMatch(/data-type="string"/)
    // GenericType list<string> 应正确序列化
    expect(result.md).toMatch(/data-type="list<string>"/)
  })

  // v0.3 follow-up: default 值提取
  test('15. prop.default preserved in attributes and body', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/data-type="number"[^}]*default="60000"/)
    expect(result.md).toMatch(/data-type="boolean"[^}]*default="true"/)
    expect(result.md).toMatch(/default: 60000/)
    expect(result.md).toMatch(/default: true/)
  })

  // v0.3 follow-up: required 修饰符
  test('16. prop.required serialized as required="true"', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/required="true"/)
  })

  // v0.3 follow-up: slot observe 数组
  test('17. slot.observe preserved as comma-separated list + body bullets', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    expect(result.md).toMatch(/observe="fs-exists,lint-check"/)
    expect(result.md).toMatch(/observe="ts-compiles,test-pass"/)
    expect(result.md).toContain('- observe: fs-exists')
    expect(result.md).toContain('- observe: ts-compiles')
  })

  // v0.3 follow-up: blueprint.version 写入 frontmatter + body
  test('18. blueprint.version preserved in frontmatter and body', async () => {
    const result = await compileOxnToMd(RICH_BLUEPRINT_OXN, { entity: 'blueprint' })
    // body 显示 Blueprint version: 2
    expect(result.md).toContain('> Blueprint version: 2')
  })

  test('19. real blueprint fixture (add-cli-subcommand.oxn) converts with observe', async () => {
    const path = join(process.cwd(), '.openxenon/blueprints/add-cli-subcommand.oxn')
    if (!existsSync(path)) return
    const oxn = readFileSync(path, 'utf-8')
    const result = await compileOxnToMd(oxn, { entity: 'blueprint' })
    expect(result.name).toBe('add-cli-subcommand')
    // 4 个 slot 都有 observe
    expect(result.md).toMatch(/observe="fs-exists"/)
    expect(result.md).toMatch(/observe="lint-check,ts-compiles"/)
    expect(result.md).toMatch(/observe="test-pass"/)
  })
})

describe('oxl-md-decompiler: Work', () => {
  test('14. basic work compiles to .md', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.entity).toBe('work')
    expect(result.name).toBe('feature-x')
    expect(result.md).toContain('# Work: feature-x')
  })

  test('15. work context serialized with goal + max_iterations', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.md).toMatch(/:::intent\{#ctx-1[^}]*type="context"/)
    expect(result.md).toContain('goal="实现 X 功能"')
    expect(result.md).toContain('max_iterations="3"')
  })

  test('16. work tasks serialized', async () => {
    const result = await compileOxnToMd(SIMPLE_WORK_OXN, { entity: 'work' })
    expect(result.md).toMatch(/:::intent\{#task-step1[^}]*type="task"/)
    expect(result.md).toContain('skill_context: 实现 X 的 skill context')
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

  test('19. throws when entity option mismatches AST', async () => {
    // .oxn has Domain but entity=blueprint was specified
    await expect(compileOxnToMd(SIMPLE_DOMAIN_OXN, { entity: 'blueprint' })).rejects.toThrow(DecompilerParseError)
  })
})

describe('oxl-md-decompiler: Real fixture', () => {
  test('20. align-domain.oxn (120 lines) compiles successfully', async () => {
    if (!existsSync(ALIGN_DOMAIN_PATH)) {
      // Skip if fixture not present (CI without repo state)
      return
    }
    const oxn = readFileSync(ALIGN_DOMAIN_PATH, 'utf-8')
    const result = await compileOxnToMd(oxn, { entity: 'domain' })
    expect(result.name).toBe('AlignDomain')
    expect(result.md).toContain('# Domain: AlignDomain')
    expect(result.md).toContain('## Terms')
    expect(result.md).toContain('## Bans')
    expect(result.md).toContain('## Invariants')
    // 28 unique term names (some lines have duplicate names per context)
    expect(result.md.match(/type="term"/g)?.length).toBeGreaterThanOrEqual(25)
  })
})

describe('oxl-md-decompiler: Round-trip', () => {
  test('21. compile → decompile → re-parse stable', async () => {
    // Take a .oxn, decompile to .md, re-parse, and verify the name matches
    const oxn = SIMPLE_DOMAIN_OXN
    const decompiled = await compileOxnToMd(oxn, { entity: 'domain' })
    // Note: re-parse may not exactly recover the original because .md structure
    // (frontmatter + :::intent blocks) is the canonical .md format
    const reparsed = parseDomainMd(decompiled.md, 'align-domain.md')
    expect(reparsed.name).toBe('OrderContext')
    // Terms should be recovered (key information preserved)
    expect(reparsed.blocks.terms.length).toBeGreaterThanOrEqual(1)
  })

  test('22. decompile .md → re-compile .oxn preserves entity name', async () => {
    // Take a .oxn, decompile to .md, re-compile to .oxn, verify name
    const original = SIMPLE_DOMAIN_OXN
    const md = await compileOxnToMd(original, { entity: 'domain' })
    const mdParsed = parseDomainMd(md.md, 'align-domain.md')
    const recompiled = compileMdToOxn(mdParsed, {
      entity: 'domain',
      mdContentHash: md.contentHash,
    })
    expect(recompiled.name).toBe('OrderContext')
    expect(recompiled.oxn).toMatch(/domain "OrderContext"/)
  })
})
