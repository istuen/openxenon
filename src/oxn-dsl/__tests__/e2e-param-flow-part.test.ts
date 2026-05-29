// E2E Part Definition — 独立 Part 解析验证

import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OxnAssemblyPart } from '../schemas/oxn-assembly.schema'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const PART_OXN = `
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
`

describe('E2E Part — 独立 Part 解析验证', () => {
  let partIR: OxnAssemblyPart

  beforeAll(async () => {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None

    const uri = URI.file('/virtual/test-part.oxn')
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(PART_OXN, uri, token)

    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)

    const oxnDoc = doc.parseResult.value as OXNDocument
    const categories = categorizeEntities(oxnDoc)

    partIR = categories.parts.find((p) => p.name === 'my-runner')!
    expect(partIR).toBeDefined()
    expect(partIR.probes).toHaveLength(1)
  })

  test('Part 解析成功，含 probe 和 execution', () => {
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
