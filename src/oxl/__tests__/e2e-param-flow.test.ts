// =============================================================================
// e2e-param-flow.test.ts
//
// 3 个独立 entity (Blueprint / Part / Work) 的端到端解析 → IR 流程。
// 合并自：
//   - e2e-param-flow-blueprint.test.ts
//   - e2e-param-flow-part.test.ts
//   - e2e-param-flow-task.test.ts
//
// 用同一套 createOxnServices + categorizeEntities pipeline 跑三种 fixture。
// =============================================================================

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnAssemblyIR, OxnAssemblyPart, OxnWorkIR } from '../schemas/oxn-assembly.schema'
import type { OXNDocument } from '../langium-driver/generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium-driver/oxn-services'

interface Fixture {
  uri: string
  source: string
}

const BLUEPRINT_FIXTURE: Fixture = {
  uri: '/virtual/test-blueprint.oxn',
  source: `
blueprint "e2e-flow" task {
  version = 1
  prop "cmd" { type = string; default = "echo hello" }

  slot "runner" {
    deps = []
  }
}
`,
}

const PART_FIXTURE: Fixture = {
  uri: '/virtual/test-part.oxn',
  source: `
part "my-runner" {
  description = "Test runner"
  prop "target_cmd" { type = string; default = "echo hello" }
  probe run_echo align "execute" ref "@oxn/probes/exec-exit-zero" {
    params = {
      command = "\${prop.target_cmd}"
    }
  }
  execution = [run_echo]
}
`,
}

const WORK_FIXTURE: Fixture = {
  uri: '/virtual/test-work.oxn',
  source: `
work "verify-e2e" {
  blueprint "e2e-flow" ref "@prj/blueprints/e2e-flow";

  task "Runner" {
    blueprint "e2e-flow"
    part "slot-name" {
      skill_context = "echo hello_from_e2e"
    }
  }
}
`,
}

let blueprintIR: OxnAssemblyIR
let partIR: OxnAssemblyPart
let workIR: OxnWorkIR

beforeAll(async () => {
  const services = createOxnServices()
  const shared = services.shared
  shared.ServiceRegistry.register(services)

  const docBuilder = shared.workspace.DocumentBuilder
  const token = Cancellation.CancellationToken.None
  const factory = shared.workspace.LangiumDocumentFactory

  async function parse(fixture: Fixture): Promise<OXNDocument> {
    const doc = await factory.fromString(fixture.source, URI.file(fixture.uri), token)
    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)
    return doc.parseResult.value as OXNDocument
  }

  blueprintIR = categorizeEntities(await parse(BLUEPRINT_FIXTURE)).blueprints[0]!
  expect(blueprintIR.name).toBe('e2e-flow')

  partIR = categorizeEntities(await parse(PART_FIXTURE)).parts.find((p) => p.name === 'my-runner')!
  expect(partIR.probes).toHaveLength(1)

  workIR = categorizeEntities(await parse(WORK_FIXTURE)).works[0]!
  expect(workIR.name).toBe('verify-e2e')
})

describe('E2E Blueprint — 独立 Blueprint 解析验证', () => {
  test('含 props 和 slots', () => {
    expect(blueprintIR.props).toHaveLength(1)
    expect(blueprintIR.props[0]?.name).toBe('cmd')
    expect(blueprintIR.props[0]?.type).toBeDefined()
    expect(blueprintIR.props[0]?.type).not.toBeNull()
    expect(blueprintIR.slots).toHaveLength(1)
    expect(blueprintIR.slots[0]?.name).toBe('runner')
    expect(blueprintIR.blueprintParts).toHaveLength(0)
  })
})

describe('E2E Part — 独立 Part 解析验证', () => {
  test('含 probe 和 execution', () => {
    expect(partIR.name).toBe('my-runner')
    expect(partIR.description).toBe('Test runner')
    expect(partIR.props).toHaveLength(1)
    expect(partIR.props[0]?.name).toBe('target_cmd')
    expect(partIR.props[0]?.type).toBeDefined()
    expect(partIR.props[0]?.type).not.toBeNull()
    expect(partIR.probes).toHaveLength(1)
    expect(partIR.probes[0]?.name).toBe('run_echo')
    expect(partIR.probes[0]?.ref).toBe('@oxn/probes/exec-exit-zero')
    expect(partIR.execution).toBeDefined()
    expect(Array.isArray(partIR.execution)).toBe(true)
  })
})

describe('E2E Work — 独立 Work 解析验证 (含 task 编排)', () => {
  test('work 含 task 编排', () => {
    expect(workIR.tasks).toHaveLength(1)
    const task = workIR.tasks[0]!
    expect(task.name).toBe('Runner')
    expect(task.blueprint).toBe('e2e-flow')
    expect(task.parts).toHaveLength(1)
    expect(task.parts[0].name).toBe('slot-name')
  })
})
