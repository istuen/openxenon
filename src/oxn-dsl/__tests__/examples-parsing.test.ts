import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import { existsSync } from 'fs'
import { join } from 'path'

const EXAMPLES_DIR = join(__dirname, '../examples')

describe('OXN DSL Examples', () => {
  test('probe-example.oxn 文件存在', () => {
    expect(existsSync(join(EXAMPLES_DIR, 'probe-example.oxn'))).toBe(true)
  })

  test('part-example.oxn 文件存在', () => {
    expect(existsSync(join(EXAMPLES_DIR, 'part-example.oxn'))).toBe(true)
  })

  test('blueprint-example.oxn 文件存在', () => {
    expect(existsSync(join(EXAMPLES_DIR, 'blueprint-example.oxn'))).toBe(true)
  })

  test('work-example.oxn 文件存在', () => {
    expect(existsSync(join(EXAMPLES_DIR, 'work-example.oxn'))).toBe(true)
  })
})