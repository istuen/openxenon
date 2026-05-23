// E2E Param Flow — 端到端参数穿透验证 (v3.1 Slot Paradigm)

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import { getProbeHandler } from '../../infra/probes'
import { adaptFrozenToBlueprint } from '../../kernel/compiler/frozen-to-blueprint-adapter'
import { OxnKernelAdapter } from '../../oxn-dsl/compiler/oxn-adapter'
import { evaluateProbe } from '../../kernel/probes/evaluator'
import type { OxnAssemblyIR, OxnAssemblyPart, OxnAssemblySlotBinding } from '../../kernel/schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const MINIMAL_OXN = `
part "my-runner" {
  description = "Test runner"
  prop "target_cmd" { type = string; default = "echo hello" }
  probe run_echo ref "@oxn/probes/exec-exit-zero" {
    params = {
      command = "\${prop.target_cmd}"
    }
  }
  execution = [run_echo]
}

blueprint "e2e-flow" {
  version = 1
  prop "cmd" { type = string; default = "echo hello" }

  part slot "runner" {
    deps = []
  }
}

task "verify-e2e" use "@prj/blueprints/e2e-flow" {
  part slot "runner" ref "@prj/parts/my-runner" {
    prop target_cmd = "echo hello_from_e2e"
  }
}
`

describe('E2E Param Flow — 端到端参数穿透验证', () => {
  let blueprintIR: OxnAssemblyIR
  let concretePart: OxnAssemblyPart
  let slotBindings: OxnAssemblySlotBinding[]

  beforeAll(async () => {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None

    const uri = URI.file('/virtual/test-flow.oxn')
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(MINIMAL_OXN, uri, token)

    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)

    const oxnDoc = doc.parseResult.value as OXNDocument
    const categories = categorizeEntities(oxnDoc)

    blueprintIR = categories.blueprints[0]!
    expect(blueprintIR).toBeDefined()
    expect(blueprintIR.name).toBe('e2e-flow')

    concretePart = categories.parts.find((p) => p.name === 'my-runner')!
    expect(concretePart).toBeDefined()
    expect(concretePart.probes).toHaveLength(1)

    const taskIR = categories.tasks[0]!
    expect(taskIR).toBeDefined()
    expect(taskIR.name).toBe('verify-e2e')
    slotBindings = taskIR.slotBindings

    blueprintIR.concreteParts = [concretePart]
  })

  test('1. Langium 解析 → OXN AST 成功', () => {
    expect(blueprintIR.props).toHaveLength(1)
    expect(blueprintIR.props[0]!.name).toBe('cmd')
    expect(blueprintIR.slots).toHaveLength(1)
    expect(blueprintIR.slots[0]!.name).toBe('runner')
    expect(blueprintIR.concreteParts).toHaveLength(1)
    expect(blueprintIR.concreteParts[0]!.name).toBe('my-runner')
  })

  test('2. Task slot binding 属性注入正确', () => {
    expect(slotBindings).toHaveLength(1)
    const binding = slotBindings[0]!
    expect(binding.slot).toBe('runner')
    expect(binding.ref).toBe('@prj/parts/my-runner')
    expect(binding.props['target_cmd']).toBe('echo hello_from_e2e')
  })

  test('3. OxnAssemblyIR → FrozenBlueprint 适配成功', () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, slotBindings)
    expect(result.warnings).toHaveLength(0)

    const frozen = result.frozen
    expect(frozen.id).toBe('e2e-flow')
    expect(frozen.parts.length).toBeGreaterThanOrEqual(1)
  })

  test('4. 参数穿透: Task prop → template → probe', () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, slotBindings)
    const frozen = result.frozen

    const runnerPart = frozen.parts.find((p) => p.id === 'runner')
    expect(runnerPart).toBeDefined()
    const probe = runnerPart!.probes[0]!
    const command = probe.params?.command as string
    expect(command).toBe('echo hello_from_e2e')
  })

  test('5. FrozenBlueprint → Blueprint 适配成功', () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, slotBindings)
    const frozen = result.frozen

    const blueprint = adaptFrozenToBlueprint(frozen)
    expect(blueprint.id).toBe('e2e-flow')
    expect(blueprint.parts.length).toBeGreaterThanOrEqual(1)
  })

  test('6. 真实 Probe 执行: shell_exec 运行 echo 并拿到 PASSED 结果', async () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, slotBindings)
    const frozen = result.frozen

    const runnerPart = frozen.parts.find((p) => p.id === 'runner')
    expect(runnerPart).toBeDefined()
    const frozenProbe = runnerPart!.probes[0]!
    const probeType = frozenProbe.type
    const probeParams = frozenProbe.params || {}

    const handler = getProbeHandler(probeType)
    expect(handler).not.toBeNull()

    const observation = (await handler!(
      { command: probeParams.command, pattern: probeParams.pattern, cwd: probeParams.cwd },
      { projectRoot: process.cwd() },
    )) as any

    expect(observation.probeType).toBe('exec_exit_zero')
    expect(observation.exitCode).toBe(0)

    const verdict = evaluateProbe({ type: probeType, params: probeParams as Record<string, unknown> }, observation)

    expect(verdict.passed).toBe(true)
    expect(verdict.message).toBe('Exit code 0')
    expect(observation.output).toContain('hello_from_e2e')
  })
})
