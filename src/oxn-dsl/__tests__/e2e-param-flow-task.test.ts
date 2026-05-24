// E2E Work Definition — 独立 Work 解析验证

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnAssemblyTaskIR, OxnAssemblySlotBinding } from '../../kernel/schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const WORK_OXN = `
work "verify-e2e" type "task" ref "@prj/blueprints/e2e-flow" {
  part slot "runner" ref "@prj/parts/my-runner" {
    prop target_cmd = "echo hello_from_e2e"
  }
}
`

describe('E2E Work — 独立 Work 解析验证', () => {
  let workIR: OxnAssemblyTaskIR
  let slotBindings: OxnAssemblySlotBinding[]

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
    expect(workIR.use).toBe('@prj/blueprints/e2e-flow')
    slotBindings = workIR.slotBindings
  })

  test('Work 解析成功，含 slot binding', () => {
    expect(slotBindings).toHaveLength(1)
    const binding = slotBindings[0]!
    expect(binding.slot).toBe('runner')
    expect(binding.ref).toBe('@prj/parts/my-runner')
    expect(binding.props.target_cmd).toBe('echo hello_from_e2e')
  })
})
