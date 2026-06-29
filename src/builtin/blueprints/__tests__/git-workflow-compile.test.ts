// =============================================================================
// git-workflow-compile.test.ts — builtin 蓝图 `git-workflow.oxn` 编译 + 形状守卫
//
// 覆盖：
//   1. 解析无 lex/parse 错误
//   2. 找到 BlueprintDeclaration 且 name === "git-workflow"
//   3. 恰好 4 个 slot，名字依次匹配设计
//   4. slot 之间的 deps 拓扑正确（线性链）
//   5. observe 引用 4 个已注册的 git probe semanticName
//   6. catalog 中 4 个 git probe 都存在（不依赖具体 L1 实现路径）
//
// 跑法：bun test src/builtin/blueprints/__tests__/git-workflow-compile.test.ts
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { createOxnParser, isBlueprintDeclaration, type BlueprintDeclaration, type OXNDocument } from '@openxenon/engine/oxl'
import { PROBE_CATALOG, getCatalogEntry } from '@openxenon/engine/kernel/verdicts/catalog'

const BP_PATH = join(import.meta.dir, '..', 'git-workflow.oxn')

async function loadBlueprintAst(): Promise<BlueprintDeclaration> {
  const src = readFileSync(BP_PATH, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(src, URI.file(BP_PATH))
  expect(r.lexerErrors).toEqual([])
  expect(r.parseErrors).toEqual([])
  const ast = r.ast as OXNDocument
  const bp = ast.entities.find(isBlueprintDeclaration)
  expect(bp).toBeDefined()
  return bp as BlueprintDeclaration
}

describe('builtin: git-workflow.oxn', () => {
  test('1. 文件存在且非空', () => {
    const src = readFileSync(BP_PATH, 'utf-8')
    expect(src.length).toBeGreaterThan(0)
    expect(src).toContain('blueprint "git-workflow"')
  })

  test('2. 解析无 lex/parse 错误，且含 1 个 BlueprintDeclaration', async () => {
    const bp = await loadBlueprintAst()
    expect(bp.name).toBe('git-workflow')
    expect(bp.version).toBe(1)
  })

  test('3. 恰好 4 个 slot，名字依次为设计中的 4 阶段', async () => {
    const bp = await loadBlueprintAst()
    expect(bp.partSlots.length).toBe(4)
    expect(bp.partSlots.map((s) => s.name)).toEqual([
      'ensure_clean_workspace',
      'prepare_branch',
      'develop',
      'verify_merge_feasible',
    ])
  })

  test('4. deps 拓扑：线性链 (1→2→3→4)，无环', async () => {
    const bp = await loadBlueprintAst()
    const byName = new Map(bp.partSlots.map((s) => [s.name, s]))
    expect(byName.get('ensure_clean_workspace')?.deps).toEqual([])
    expect(byName.get('prepare_branch')?.deps).toEqual(['ensure_clean_workspace'])
    expect(byName.get('develop')?.deps).toEqual(['prepare_branch'])
    expect(byName.get('verify_merge_feasible')?.deps).toEqual(['develop'])
  })

  test('5. observe 数组引用 catalog 中已注册的 4 个 git probe', async () => {
    const bp = await loadBlueprintAst()
    const observed = bp.partSlots.flatMap((s) =>
      s.observe.filter((o) => o.$type === 'ObserveDeclaration').flatMap((o) => o.observes),
    )
    expect(observed.sort()).toEqual(['git-branch-exists', 'git-clean', 'git-merge-feasible', 'git-status-clean'].sort())
  })

  test('6. 4 个 git probe 都在 catalog 中（builtin=oxn, 命名空间 @oxn/probes/...）', () => {
    for (const name of ['git-clean', 'git-branch-exists', 'git-status-clean', 'git-merge-feasible']) {
      const entry = getCatalogEntry(name)
      expect(entry).not.toBeNull()
      expect(entry?.builtin).toBe('oxn')
      expect(entry?.internalRef?.startsWith('@oxn/probes/')).toBe(true)
    }
    const gitProbes = PROBE_CATALOG.filter((p) => p.semanticName.startsWith('git-'))
    expect(gitProbes.length).toBe(4)
  })
})
