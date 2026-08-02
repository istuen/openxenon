// =============================================================================
// work-context-builder-stack.test.ts — v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5) Stack.tools 注入
//
// 覆盖：
//  13. loadStackToolsFromBlueprint: 加载 Blueprint.use.stack → tools[]
//  14. 缺 Stack 文件 / 无 Blueprint → stackTools 空数组
//  15. buildWorkContext（work-level）：含 stackTools 字段
//  16. renderContextHuman: 渲染 ## Stack Tools (N)
//
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-context-builder.test.ts 拆出 P6 部分
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildWorkContext, renderContextHuman, loadStackToolsFromBlueprint } from '../work-context-builder'

/**
 * 构造含 Stack ref 的 blueprintIR
 */
function makeBlueprintWithStack(
  stackName: string,
  stackFileName: string,
): {
  blueprintIR: {
    schemaVersion: number
    workName: string
    generatedAt: string
    sourceHash: string
    declaredRefs: string[]
    blueprints: Array<{
      name: string
      scope: string
      file: string
      status: string
      version: number
      slots: Array<{ name: string; deps: string[]; observe: string[] }>
      errors: string[]
      ref: string
      domainRefs: Array<unknown>
      workflowRefs: Array<unknown>
      stackRefs: Array<{ name: string; kind: string; ref: string; scope: string; version: number; fileHash: string }>
      nestedBlueprintRefs: Array<unknown>
    }>
  }
} {
  return {
    blueprintIR: {
      schemaVersion: 1,
      workName: 'p6-test',
      generatedAt: '2026-07-17T00:00:00.000Z',
      sourceHash: 'd'.repeat(64),
      declaredRefs: ['@prj/blueprints/oxn-blueprint'],
      blueprints: [
        {
          name: 'oxn-blueprint',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/oxn-blueprint.md',
          status: 'ok',
          version: 1,
          slots: [{ name: 'design', deps: [], observe: ['lint-check'] }],
          errors: [],
          ref: '@prj/blueprints/oxn-blueprint',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [
            {
              name: stackName,
              kind: 'stack',
              ref: `@prj/stack/${stackFileName}`,
              scope: '@prj',
              version: 1,
              fileHash: 'e'.repeat(64),
            },
          ],
          nestedBlueprintRefs: [],
        },
      ],
    },
  }
}

describe('loadStackToolsFromBlueprint — v0.7.3 P6', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-p6-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('加载真实 Stack .md → 提取 tools[]', () => {
    const { blueprintIR } = makeBlueprintWithStack('oxn-stack', 'oxn-stack')
    const stackDir = join(tmpDir, '.openxenon', 'assets', 'stacks')
    mkdirSync(stackDir, { recursive: true })
    writeFileSync(
      join(stackDir, 'oxn-stack.md'),
      `---
entity: stack
version: 0.2.0
name: oxn-stack
---
# Stack: oxn-stack

> Test stack

## Tools

### bun
- version: 1.3+
- role: runtime + bundler + test runner + package manager
- command: bun install / bun build / bun test
- config: bun.lock / bunfig.toml
- desc: 包管理器

### typescript
- version: 5.x
- role: language
- command: bun run typecheck
- config: tsconfig.json
- desc: 严格模式
`,
    )
    const tools = loadStackToolsFromBlueprint(blueprintIR as never, tmpDir)
    expect(tools).toHaveLength(2)
    expect(tools[0]).toMatchObject({ name: 'bun', version: '1.3+', command: 'bun install / bun build / bun test' })
    expect(tools[1]).toMatchObject({ name: 'typescript', version: '5.x', config: 'tsconfig.json' })
  })

  test('Stack 文件缺失 → 返回 []', () => {
    const { blueprintIR } = makeBlueprintWithStack('oxn-stack', 'oxn-stack')
    const tools = loadStackToolsFromBlueprint(blueprintIR as never, tmpDir)
    expect(tools).toEqual([])
  })

  test('blueprintIR 无 stackRefs → 返回 []', () => {
    const bp = {
      schemaVersion: 1,
      workName: 'p6-test',
      generatedAt: '2026-07-17T00:00:00.000Z',
      sourceHash: 'd'.repeat(64),
      declaredRefs: [],
      blueprints: [
        {
          name: 'oxn-blueprint',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/oxn-blueprint.md',
          status: 'ok',
          version: 1,
          slots: [],
          errors: [],
          ref: '@prj/blueprints/oxn-blueprint',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [],
          nestedBlueprintRefs: [],
        },
      ],
    }
    const tools = loadStackToolsFromBlueprint(bp as never, tmpDir)
    expect(tools).toEqual([])
  })

  test('Stack 文件 parse 失败 → 跳过（drift 兜底）', () => {
    const { blueprintIR } = makeBlueprintWithStack('oxn-stack', 'oxn-stack')
    const stackDir = join(tmpDir, '.openxenon', 'assets', 'stacks')
    mkdirSync(stackDir, { recursive: true })
    writeFileSync(join(stackDir, 'oxn-stack.md'), `# Stack: oxn-stack\n\n## Tools\n\n### bun\n- version: 1.3+\n`)
    const tools = loadStackToolsFromBlueprint(blueprintIR as never, tmpDir)
    expect(tools).toHaveLength(1)
    expect(tools[0]?.name).toBe('bun')
    expect(tools[0]?.version).toBe('1.3+')
  })

  test('多 Blueprint 同名 stack → first wins（去重）', () => {
    const blueprintIR = {
      schemaVersion: 1,
      workName: 'p6-test',
      generatedAt: '2026-07-17T00:00:00.000Z',
      sourceHash: 'd'.repeat(64),
      declaredRefs: [],
      blueprints: [
        {
          name: 'bp-a',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/bp-a.md',
          status: 'ok',
          version: 1,
          slots: [],
          errors: [],
          ref: '@prj/blueprints/bp-a',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [
            {
              name: 'oxn-stack',
              kind: 'stack',
              ref: '@prj/stack/oxn-stack',
              scope: '@prj',
              version: 1,
              fileHash: 'e'.repeat(64),
            },
          ],
          nestedBlueprintRefs: [],
        },
        {
          name: 'bp-b',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/bp-b.md',
          status: 'ok',
          version: 1,
          slots: [],
          errors: [],
          ref: '@prj/blueprints/bp-b',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [
            {
              name: 'oxn-stack',
              kind: 'stack',
              ref: '@prj/stack/oxn-stack',
              scope: '@prj',
              version: 1,
              fileHash: 'e'.repeat(64),
            },
          ],
          nestedBlueprintRefs: [],
        },
      ],
    }
    const stackDir = join(tmpDir, '.openxenon', 'assets', 'stacks')
    mkdirSync(stackDir, { recursive: true })
    writeFileSync(
      join(stackDir, 'oxn-stack.md'),
      `# Stack: oxn-stack\n\n## Tools\n\n### bun\n- version: 1.3+\n\n### typescript\n- version: 5.x\n`,
    )
    const tools = loadStackToolsFromBlueprint(blueprintIR as never, tmpDir)
    expect(tools).toHaveLength(2)
  })
})

describe('buildWorkContext — v0.7.3 P6: stackTools 字段', () => {
  let tmpDir: string
  const workName = 'p6-stack-work'

  function setupWithStack(stackMd: string): void {
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n` +
        `## Context\n### main\n- goal: demo\n- constraints: []\n\n` +
        `## Refs\n### TrustChain\n- kind: domain\n- ref: @prj/domains/TrustChain\n\n` +
        `## Tasks\n### step1\n- domain: TrustChain\n`,
    )
    const stackDir = join(tmpDir, '.openxenon', 'assets', 'stacks')
    mkdirSync(stackDir, { recursive: true })
    writeFileSync(join(stackDir, 'oxn-stack.md'), stackMd)
    const idx = {
      schemaVersion: 1,
      workName,
      generatedAt: '2026-07-17T00:00:00.000Z',
      projectRoot: tmpDir,
      sourceHash: 'a'.repeat(64),
      declaredRefs: ['@prj/blueprints/oxn-blueprint'],
      blueprintCount: 1,
      invalidCount: 0,
      blueprints: [
        {
          name: 'oxn-blueprint',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/oxn-blueprint.md',
          status: 'ok',
          version: 1,
          slots: [{ name: 'design', deps: [], observe: ['lint-check'] }],
          errors: [],
          ref: '@prj/blueprints/oxn-blueprint',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [
            {
              name: 'oxn-stack',
              kind: 'stack',
              ref: '@prj/stack/oxn-stack',
              scope: '@prj',
              version: 1,
              fileHash: 'e'.repeat(64),
            },
          ],
          nestedBlueprintRefs: [],
        },
      ],
    }
    writeFileSync(join(workDir, 'blueprints.json'), JSON.stringify(idx))
  }

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-p6-ctx-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('work-level context 含 stackTools 字段', () => {
    setupWithStack(
      `# Stack: oxn-stack\n\n## Tools\n\n### bun\n- version: 1.3+\n- command: bun install\n- config: bun.lock\n- role: runtime\n- desc: 包管理器\n\n### typescript\n- version: 5.x\n`,
    )
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.stackTools).toBeDefined()
    expect(ctx.stackTools).toHaveLength(2)
    expect(ctx.stackTools?.[0]).toMatchObject({ name: 'bun', version: '1.3+' })
    expect(ctx.stackTools?.[1]?.name).toBe('typescript')
  })

  test('renderContextHuman 渲染 ## Stack Tools (N)', () => {
    setupWithStack(`# Stack: oxn-stack\n\n## Tools\n\n### bun\n- version: 1.3+\n- command: bun install\n`)
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    const out = renderContextHuman(ctx)
    expect(out).toContain('## Stack Tools (1)')
    expect(out).toContain('- bun')
    expect(out).toContain('Probe runtime metadata')
  })

  test('无 Stack 文件 → stackTools 省略（向后兼容）', () => {
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n## Context\n### main\n- goal: demo\n\n## Tasks\n### step1\n`,
    )
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.stackTools).toBeUndefined()
  })

  test('blueprint 无 stackRefs → stackTools 省略', () => {
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n## Context\n### main\n- goal: demo\n\n## Tasks\n### step1\n`,
    )
    const idx = {
      schemaVersion: 1,
      workName,
      generatedAt: '2026-07-17T00:00:00.000Z',
      projectRoot: tmpDir,
      sourceHash: 'a'.repeat(64),
      declaredRefs: ['@prj/blueprints/oxn-blueprint'],
      blueprintCount: 1,
      invalidCount: 0,
      blueprints: [
        {
          name: 'oxn-blueprint',
          scope: '@prj',
          file: '.openxenon/assets/blueprints/oxn-blueprint.md',
          status: 'ok',
          version: 1,
          slots: [{ name: 'design', deps: [], observe: [] }],
          errors: [],
          ref: '@prj/blueprints/oxn-blueprint',
          domainRefs: [],
          workflowRefs: [],
          stackRefs: [],
          nestedBlueprintRefs: [],
        },
      ],
    }
    writeFileSync(join(workDir, 'blueprints.json'), JSON.stringify(idx))
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.stackTools).toBeUndefined()
  })
})
