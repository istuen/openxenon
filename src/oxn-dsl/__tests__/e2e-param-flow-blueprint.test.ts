// E2E Blueprint Definition — 独立 Blueprint 解析验证

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnAssemblyIR } from '../../kernel/schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const BLUEPRINT_OXN = `
blueprint "e2e-flow" {
  version = 1
  prop "cmd" { type = string; default = "echo hello" }

  part slot "runner" {
    deps = []
  }
}
`

describe('E2E Blueprint — 独立 Blueprint 解析验证', () => {
  let blueprintIR: OxnAssemblyIR

  beforeAll(async () => {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None

    const uri = URI.file('/virtual/test-blueprint.oxn')
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(BLUEPRINT_OXN, uri, token)

    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)

    const oxnDoc = doc.parseResult.value as OXNDocument
    const categories = categorizeEntities(oxnDoc)

    blueprintIR = categories.blueprints[0]!
    expect(blueprintIR).toBeDefined()
    expect(blueprintIR.name).toBe('e2e-flow')
  })

  test('Blueprint 解析成功，含 props 和 slots', () => {
    expect(blueprintIR.props).toHaveLength(1)
    expect(blueprintIR.props[0]?.name).toBe('cmd')
    expect(blueprintIR.props[0]?.type).toBeDefined()
    expect(blueprintIR.props[0]?.type).not.toBeNull()
    expect(blueprintIR.slots).toHaveLength(1)
    expect(blueprintIR.slots[0]?.name).toBe('runner')
    expect(blueprintIR.blueprintParts).toHaveLength(0)
  })
})
