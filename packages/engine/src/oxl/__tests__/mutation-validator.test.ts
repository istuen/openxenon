// =============================================================================
// mutation-validator.test.ts
//
// Extracted from phase3.test.ts (PR-3.2). 4 active cases; the TaskSandbox
// cases in phase3 are entirely commented (getFs returns undefined) and have
// been dropped — TaskSandbox has no active callers in v1.1.
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { createOxnAssemblyIR, type OxnAssemblyPart } from '../schemas/oxn-assembly.schema'
import { MutationValidator } from '../validator/mutation-validator'

function part(name: string, execution: string[] = []): OxnAssemblyPart {
  return { name, description: undefined, props: [], probes: [], execution }
}

describe('MutationValidator', () => {
  test('合法变异通过：新增 part + stage', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(part('build', ['a']))
    original.stages = [{ name: 'build', run: 'part.build.run', deps: [] }]

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(part('build', ['a']))
    mutated.concreteParts.push(part('deploy', ['b']))
    mutated.stages = [
      { name: 'build', run: 'part.build.run', deps: [] },
      { name: 'deploy', run: 'part.deploy.run', deps: ['build'] },
    ]

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(true)
  })

  test('implements 契约篡改被拦截（v3.0 废除 implements 后无契约可篡改）', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(part('worker', ['a']))

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(part('worker', ['a']))

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(true)
  })

  test('part 被 stage 引用时不可删除', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(part('worker', ['x']))
    original.stages = [{ name: 'worker', run: 'part.worker.run', deps: [] }]

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.stages = [{ name: 'worker', run: 'part.worker.run', deps: [] }]

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('不可删除')
  })

  test('无 stage 引用时删除 part 允许', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(part('worker', ['x']))
    original.concreteParts.push(part('unused', ['y']))

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(part('worker', ['x']))

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(true)
  })
})
