import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createOxnAssemblyIR, type OxnAssemblyPart } from '../../kernel/schemas/oxn-assembly.schema'
// ========================
// Task 3.1: Sandbox Manager
// ========================
import { type SandboxState, TaskSandbox } from '../../kernel/task/sandbox-manager'

function createConcretePart(params: { name: string; execution?: string[] }): OxnAssemblyPart {
  return { name: params.name, description: undefined, props: [], probes: [], execution: params.execution || [] }
}

describe('TaskSandbox (Task 3.1)', () => {
  const tmpDir = '/tmp/oxn-sandbox-test'
  const projectRoot = join(tmpDir, 'project')
  const taskDir = join(projectRoot, '.openxenon', 'tasks', 'test-task')
  const sandboxDir = join(taskDir, 'sandbox')

  test('创建沙箱复制 Blueprint', () => {
    mkdirSync(sandboxDir, { recursive: true })
    const bpPath = join(sandboxDir, 'blueprint.json')
    const ir = createOxnAssemblyIR({ id: 'test-bp', name: 'test-bp' })
    ir.concreteParts.push(createConcretePart({ name: 'build', execution: ['probe.build'] }))
    writeFileSync(bpPath, JSON.stringify(ir, null, 2), 'utf-8')

    const state = TaskSandbox.create({
      taskId: 'test-task',
      projectRoot,
      blueprintPath: bpPath,
    })

    expect(state.taskId).toBe('test-task')
    expect(state.currentIR.id).toBe('test-bp')
    expect(state.currentIR.concreteParts).toHaveLength(1)
  })

  test('添加和删除 Part', () => {
    const bpPath = join(sandboxDir, 'blueprint.json')
    const ir = createOxnAssemblyIR({ id: 'test', name: 'test' })
    ir.concreteParts.push(createConcretePart({ name: 'build', execution: ['probe.x'] }))
    writeFileSync(bpPath, JSON.stringify(ir, null, 2), 'utf-8')

    const state = TaskSandbox.create({
      taskId: 'test-task',
      projectRoot,
      blueprintPath: bpPath,
    })

    // Add
    TaskSandbox.addPart(state, createConcretePart({ name: 'test', execution: ['probe.y'] }))
    expect(state.currentIR.concreteParts).toHaveLength(2)

    // Remove
    TaskSandbox.removePart(state, 'test')
    expect(state.currentIR.concreteParts).toHaveLength(1)

    // Cannot remove part with expectation dependency
    state.currentIR.expectations = [{ name: 'check_build', probeRef: '@oxn/probe/build', params: {}, errMsg: 'fail' }]
    expect(() => TaskSandbox.removePart(state, 'build')).toThrow('expectation')
  })

  test('本地优先原则合并全局 IR', () => {
    const globalIR = createOxnAssemblyIR({ id: 'global', name: 'global' })
    globalIR.concreteParts.push(createConcretePart({ name: 'global-build', execution: ['a'] }))
    globalIR.concreteParts.push(createConcretePart({ name: 'global-test', execution: ['b'] }))

    const sandboxIR = createOxnAssemblyIR({ id: 'sandbox', name: 'sandbox' })
    sandboxIR.concreteParts.push(createConcretePart({ name: 'sandbox-custom', execution: ['c'] }))

    const state: SandboxState = {
      taskId: 'test',
      sandboxDir: '/tmp',
      sandboxBlueprintPath: '/tmp/bp.json',
      originalBlueprintPath: '/tmp/bp.json',
      currentIR: sandboxIR,
    }

    const merged = TaskSandbox.resolveWithSandbox(state, globalIR)
    expect(merged.concreteParts).toHaveLength(3)
    expect(merged.concreteParts.map((p) => p.name)).toContain('sandbox-custom')
  })

  test('DAG 拓扑更新校验', () => {
    const bpPath = join(sandboxDir, 'blueprint.json')
    const ir = createOxnAssemblyIR({ id: 'dag-test', name: 'dag-test' })
    ir.concreteParts.push(createConcretePart({ name: 'entry', execution: ['x'] }))
    ir.concreteParts.push(createConcretePart({ name: 'dep', execution: ['y'] }))
    ir.stages = [
      { name: 'entry', run: 'part.entry.run', deps: [] },
      { name: 'dep', run: 'part.dep.run', deps: ['entry'] },
    ]
    writeFileSync(bpPath, JSON.stringify(ir, null, 2), 'utf-8')

    const state = TaskSandbox.create({
      taskId: 'dag-test',
      projectRoot,
      blueprintPath: bpPath,
    })

    // Valid deps update
    expect(() => TaskSandbox.updateDeps(state, 'dep', ['entry'])).not.toThrow()
  })
})

// ========================
// Task 3.2: Mutation Validator
// ========================
import { MutationValidator } from '../validator/mutation-validator'

describe('MutationValidator (Task 3.2)', () => {
  test('合法变异通过', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(createConcretePart({ name: 'build', execution: ['a'] }))
    original.stages = [{ name: 'build', run: 'part.build.run', deps: [] }]
    original.expectations = [{ name: 'check', probeRef: '@oxn/probe/fs-exists', params: {}, errMsg: 'err' }]

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(createConcretePart({ name: 'build', execution: ['a'] }))
    mutated.concreteParts.push(createConcretePart({ name: 'deploy', execution: ['b'] }))
    mutated.stages = [
      { name: 'build', run: 'part.build.run', deps: [] },
      { name: 'deploy', run: 'part.deploy.run', deps: ['build'] },
    ]
    mutated.expectations = [
      { name: 'check', probeRef: '@oxn/probe/fs-exists', params: {}, errMsg: 'err' },
      { name: 'new_check', probeRef: '@oxn/probe/fs-exists', params: {}, errMsg: 'new' },
    ]

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0) // 新增 expectation warning
  })

  test('implements 契约篡改被拦截', () => {
    // implements 已在 v3.0 废除，此测试仅保留结构
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(createConcretePart({ name: 'worker', execution: ['a'] }))

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(createConcretePart({ name: 'worker', execution: ['a'] }))

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(true) // 无 implements 契约，不应报错
  })

  test('expectation 删除被拦截', () => {
    const original = createOxnAssemblyIR({ id: 'test', name: 'test' })
    original.concreteParts.push(createConcretePart({ name: 'worker', execution: ['x'] }))
    original.expectations = [{ name: 'safety', probeRef: '@oxn/probe/fs-exists', params: {}, errMsg: 'err' }]

    const mutated = createOxnAssemblyIR({ id: 'test', name: 'test' })
    mutated.concreteParts.push(createConcretePart({ name: 'worker', execution: ['x'] }))
    mutated.expectations = [] // 删除了

    const result = MutationValidator.validate(original, mutated)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('不可删除')
  })
})

// ========================
// Task 3.3: Promote
// ========================
import { OxnPromoter, promoteBlueprint } from '../../cli/oxn-promote'

describe('OxnPromoter (Task 3.3)', () => {
  const tmpDir = '/tmp/oxn-promote-test'
  const projectRoot = join(tmpDir, 'project')

  test('promote 将沙箱 Blueprint 提升至 Arsenal', () => {
    const taskDir = join(projectRoot, '.openxenon', 'tasks', 'promo-test')
    const sandboxDir = join(taskDir, 'sandbox')
    mkdirSync(sandboxDir, { recursive: true })

    const bpPath = join(sandboxDir, 'blueprint.oxn')
    const ir = createOxnAssemblyIR({ id: 'promo-bp', name: 'promo-bp' })
    writeFileSync(bpPath, JSON.stringify(ir, null, 2), 'utf-8')

    const result = promoteBlueprint(taskDir, projectRoot, { force: true })
    expect(result.success).toBe(true)
    expect(result.version).toBe(2) // 1+1
    expect(result.emergent).toBe(false)

    const destPath = join(projectRoot, '.openxenon', 'arsenals', 'blueprints', 'promo-bp', 'canonical.yaml')
    expect(existsSync(destPath)).toBe(true)
  })

  test('promote --as-new 涌现', () => {
    const taskDir = join(projectRoot, '.openxenon', 'tasks', 'emerge-test')
    const sandboxDir = join(taskDir, 'sandbox')
    mkdirSync(sandboxDir, { recursive: true })

    const bpPath = join(sandboxDir, 'blueprint.oxn')
    const ir = createOxnAssemblyIR({ id: 'original', name: 'original' })
    writeFileSync(bpPath, JSON.stringify(ir, null, 2), 'utf-8')

    const promoter = new OxnPromoter()
    const result = promoter.promoteAsNew(taskDir, projectRoot, 'evolved-v2')
    expect(result.emergent).toBe(true)
    expect(result.success).toBe(true)

    const destPath = join(projectRoot, '.openxenon', 'arsenals', 'blueprints', 'evolved-v2', 'canonical.yaml')
    expect(existsSync(destPath)).toBe(true)
  })
})
