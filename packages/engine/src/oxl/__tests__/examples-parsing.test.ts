import { describe, expect, test } from 'bun:test'
import { readFileSync, statSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { createOxnParser } from '../langium-driver/oxn-services'

async function parseOxlFile(path: string): Promise<{ parseErrors: string[]; lexerErrors: string[] }> {
  const content = readFileSync(path, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(path))
  return {
    parseErrors: r.parseErrors,
    lexerErrors: r.lexerErrors,
  }
}

// v0.0.28+：work-examples 必须用新规 deps = [...]。
// 单独测 works/ 目录下的真实 work（已用 v0.1-final 语法）能否 parse。
import { readdirSync } from 'fs'
const WORKS_DIR = join(__dirname, '../../../../../.openxenon/works')

describe('OXL 真实 works - parse 全过（v0.1-final 语法）', () => {
  const works: string[] = []
  try {
    if (statSync(WORKS_DIR, { throwIfNoEntry: false })) {
      for (const w of readdirSync(WORKS_DIR)) {
        const workOxn = join(WORKS_DIR, w, 'work.oxn')
        try {
          if (statSync(workOxn).isFile()) {
            works.push(workOxn)
          }
        } catch {
          // skip
        }
      }
    }
  } catch {
    // skip
  }

  test('works 目录存在且有 work.oxn', () => {
    expect(works.length).toBeGreaterThan(0)
  })

  test.each(works)('%s 可 parse（0 error）', async (path) => {
    const r = await parseOxlFile(path)
    const allErrors = [...r.parseErrors, ...r.lexerErrors]
    if (allErrors.length > 0) {
      console.error(`  parse errors in ${path}:`)
      for (const m of allErrors) {
        console.error(`    - ${m}`)
      }
    }
    expect(allErrors).toEqual([])
  })
})
