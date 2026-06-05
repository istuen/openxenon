// E2E Work Definition — 独立 Work 解析验证 (v0.1-final blueprint ref)

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnWorkIR } from '../schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const WORK_OXN = `
work "verify-e2e" {
  blueprint "e2e-flow" ref "@prj/blueprints/e2e-flow";

  task "Runner" {
    blueprint "e2e-flow"
    part "slot-name" {
      skill_context = "echo hello_from_e2e"
    }
  }
}
`

describe('E2E Work — 独立 Work 解析验证', () => {
  let workIR: OxnWorkIR

  beforeAll(async () => {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None

    const uri = URI.file('/virtual/test-work.oxn')
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(WORK_OXN, uri, token)

    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)

    const oxnDoc = doc.parseResult.value as OXNDocument
    const categories = categorizeEntities(oxnDoc)

    workIR = categories.works[0]!
    expect(workIR).toBeDefined()
    expect(workIR.name).toBe('verify-e2e')
    expect(workIR.blueprints).toHaveLength(1)
    expect(workIR.blueprints[0]?.name).toBe('e2e-flow')
  })

  test('Work 解析成功，含 task 编排', () => {
    expect(workIR.tasks).toHaveLength(1)
    const task = workIR.tasks[0]!
    expect(task.name).toBe('Runner')
    expect(task.blueprint).toBe('e2e-flow')
    expect(task.parts).toHaveLength(1)
    expect(task.parts[0].name).toBe('slot-name')
  })
})
