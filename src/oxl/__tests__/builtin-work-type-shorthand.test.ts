import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const SHORTHAND_TASK = `
blueprint "shorthand-task" task {
  slot "build" { deps = [] }
}
`

const EXPLICIT_TASK = `
blueprint "explicit-task" task {
  slot "build" { deps = [] }
}
`

const CUSTOM_TYPE = `
blueprint "custom-fix" task {
  slot "debug" { deps = [] }
}
`

describe('Built-in Work Type Shorthand', () => {
  let services: ReturnType<typeof createOxnServices>

  beforeAll(async () => {
    services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)
  })

  async function parseBlueprint(oxn: string) {
    const shared = services.shared
    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None
    const uri = URI.file('/virtual/test.oxn')
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(oxn, uri, token)
    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)
    return doc.parseResult.value as OXNDocument
  }

  test('task keyword produces type = "task"', async () => {
    const doc = await parseBlueprint(SHORTHAND_TASK)
    const categories = categorizeEntities(doc)
    expect(categories.blueprints[0]?.type).toBe('task')
  })

  test('shorthand task type', async () => {
    const doc = await parseBlueprint(SHORTHAND_TASK)
    const categories = categorizeEntities(doc)
    expect(categories.blueprints[0]?.type).toBe('task')
  })

  test('custom type with explicit type syntax', async () => {
    const doc = await parseBlueprint(CUSTOM_TYPE)
    const categories = categorizeEntities(doc)
    expect(categories.blueprints[0]?.type).toBe('task')
  })

  test('shorthand and explicit produce same AST structure', async () => {
    const shorthandDoc = await parseBlueprint(SHORTHAND_TASK)
    const explicitDoc = await parseBlueprint(EXPLICIT_TASK)

    const shorthandCategories = categorizeEntities(shorthandDoc)
    const explicitCategories = categorizeEntities(explicitDoc)

    const shorthandBp = shorthandCategories.blueprints[0]
    const explicitBp = explicitCategories.blueprints[0]

    expect(shorthandBp?.type).toBe(explicitBp?.type)
    expect(shorthandBp?.type).toBe('task')

    expect(shorthandBp?.name).toBe('shorthand-task')
    expect(explicitBp?.name).toBe('explicit-task')
  })
})
