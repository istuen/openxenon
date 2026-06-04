// E2E Work Definition — 独立 Work 解析验证 (v0.1 use_blueprint 模式)

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnWorkIR, OxnTaskRefDecl } from '../schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const WORK_OXN = `
work "verify-e2e" {
  use_blueprint "e2e-flow"
  task "Runner" align "e2e-flow.runner" {
    prop "target_cmd" = "echo hello_from_e2e"
  }
}
`

describe('E2E Work — 独立 Work 解析验证', () => {
  let workIR: OxnWorkIR
  let taskRefs: OxnTaskRefDecl[]

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
    expect(workIR.useBlueprints).toHaveLength(1)
    expect(workIR.useBlueprints[0]?.name).toBe('e2e-flow')
    taskRefs = workIR.tasks
  })

  test('Work 解析成功，含 task 编排', () => {
    expect(taskRefs).toHaveLength(1)
    const ref = taskRefs[0]!
    expect(ref.name).toBe('Runner')
    expect(ref.align).toBe('e2e-flow.runner')
  })
})
