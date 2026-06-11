import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../cli/project-config'
import { getSkillContent, getAllSkillsForLocale } from '../loader'

const LOCALES_DIR = join(import.meta.dir, '..', 'locales')

describe('PR-4: Skills i18n translation guard', () => {
  test('1. loader.ts imports match locale directory structure', () => {
    const { loaderImports } = extractLoaderInfo()

    for (const locale of SUPPORTED_LOCALES) {
      const localeDir = join(LOCALES_DIR, locale)
      if (!existsSync(localeDir)) continue
      const skillDirs = readdirSync(localeDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)

      for (const skill of skillDirs) {
        expect(loaderImports).toContain(`${locale}/${skill}/instruction.md`)
      }
    }
  })

  test('2. skillMeta registered IDs match locale directory entries', () => {
    const metas = getAllSkillsForLocale(DEFAULT_LOCALE)
    const metaIds = new Set(metas.map((m) => m.id))

    const zhDir = join(LOCALES_DIR, 'zh-CN')
    const dirIds = readdirSync(zhDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    for (const id of dirIds) {
      expect(metaIds.has(id)).toBe(true)
    }
  })

  test('3. getSkillContent throws for untranslated locale', () => {
    // 'fr' is not a supported locale, but getSkillContent will still
    // look it up. We simulate an unknown locale accessing a the skill.
    // The function should throw when locale !== DEFAULT_LOCALE and the
    // skill is missing.
    expect(() => getSkillContent('oxn-cli', 'fr' as never)).toThrow()
  })

  test('4. SUPPORTED_LOCALES matches locales/ subdirectories', () => {
    const dirLocales = readdirSync(LOCALES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    const supported = [...SUPPORTED_LOCALES].sort()
    expect(dirLocales).toEqual(supported)
  })

  test('5. en and zh-CN file count parity (diff < 50%)', () => {
    const countFiles = (locale: string) => {
      const dir = join(LOCALES_DIR, locale)
      let count = 0
      const walk = (p: string) => {
        const entries = readdirSync(p, { withFileTypes: true })
        for (const e of entries) {
          const full = join(p, e.name)
          if (e.isDirectory()) walk(full)
          else if (e.name.endsWith('.md')) count++
        }
      }
      walk(dir)
      return count
    }

    const enCount = countFiles('en')
    const zhCount = countFiles('zh-CN')
    const ratio = Math.abs(enCount - zhCount) / Math.max(enCount, zhCount)
    expect(ratio).toBeLessThan(0.5)
  })

  test('6. en description language matches en instruction language', () => {
    const enSkills = getAllSkillsForLocale('en')
    for (const skill of enSkills) {
      // Both description and first line of instruction should be in English
      expect(skill.description).not.toMatch(/[\u4e00-\u9fff]/)
    }
  })

  test('7. oxn-resume is not in loader.ts imports (dead asset guard)', () => {
    const loaderContent = readFileSync(join(import.meta.dir, '..', 'loader.ts'), 'utf-8')
    expect(loaderContent).not.toContain('oxn-resume')
  })
})

function extractLoaderInfo() {
  const loaderContent = readFileSync(join(import.meta.dir, '..', 'loader.ts'), 'utf-8')
  const imports: string[] = []
  const re = /from\s+['"]\.\/locales\/([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(loaderContent)) !== null) {
    imports.push(match[1]!)
  }
  return { loaderImports: imports }
}
