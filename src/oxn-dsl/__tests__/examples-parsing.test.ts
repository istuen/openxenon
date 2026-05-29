import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { OXNDocument } from '../generated/ast'
import { categorizeEntities } from '../generator/oxn-generator'
import { createOxnServices } from '../langium/oxn-services'

const EXAMPLES_DIR = join(__dirname, '../examples')

describe('OXN DSL Examples', () => {
  let services: ReturnType<typeof createOxnServices>

  beforeAll(async () => {
    services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)
  })

  async function parseOxnFile(filename: string): Promise<OXNDocument> {
    const shared = services.shared
    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None
    const content = readFileSync(join(EXAMPLES_DIR, filename), 'utf-8')
    const uri = URI.file(`/virtual/${filename}`)
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(content, uri, token)
    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)
    return doc.parseResult.value as OXNDocument
  }

  test('probe-example.oxn - 解析 Probe 定义', async () => {
    const doc = await parseOxnFile('probe-example.oxn')
    const categories = categorizeEntities(doc)

    expect(categories.probes).toHaveLength(1)
    expect(categories.probes[0]?.name).toBe('fs-exists')
    expect(categories.probes[0]?.description).toBe('检查指定 glob 模式的文件是否存在')
    expect(categories.probes[0]?.props).toHaveLength(1)
    expect(categories.probes[0]?.props[0]?.name).toBe('pattern')
  })

  test('part-example.oxn - 解析 Part 定义', async () => {
    const doc = await parseOxnFile('part-example.oxn')
    const categories = categorizeEntities(doc)

    expect(categories.parts).toHaveLength(1)
    expect(categories.parts[0]?.name).toBe('example-check')
    expect(categories.parts[0]?.description).toBe('示例 Part，展示 Part 声明语法')
    expect(categories.parts[0]?.props).toHaveLength(2)
    expect(categories.parts[0]?.props[0]?.name).toBe('command')
    expect(categories.parts[0]?.props[0]?.required).toBe(true)
  })

  test('blueprint-example.oxn - 文件存在且可解析', async () => {
    const doc = await parseOxnFile('blueprint-example.oxn')
    const categories = categorizeEntities(doc)

    expect(categories.blueprints).toHaveLength(1)
    expect(categories.blueprints[0]?.name).toBe('oxn-example')
  })

  test('work-example.oxn - 解析 Work 定义', async () => {
    const doc = await parseOxnFile('work-example.oxn')
    const categories = categorizeEntities(doc)

    expect(categories.works).toHaveLength(1)
    expect(categories.works[0]?.name).toBe('example-work')
    expect(categories.works[0]?.use).toBe('@oxn/blueprints/oxn-example')
    expect(categories.works[0]?.slotBindings).toHaveLength(2)
    expect(categories.works[0]?.slotBindings[0]?.slot).toBe('develop')
    expect(categories.works[0]?.slotBindings[0]?.props.feature_desc).toBe('示例开发任务')
  })
})