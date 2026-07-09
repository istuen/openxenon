/**
 * Roadmap/parser.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { parseRoadmapMdContent } from '../parser.js'

const SAMPLE_MD = `---
entity: roadmap
version: 1
name: oxn-system
abstract: |
  Test abstract for parser unit test
oxn-source-sha: abc
synced-at: 2026-07-09
---

# Roadmap: oxn-system

> Test top-level description

## Scenes

### scene: doc
> Doc scenario

| kind | name | description |
|---|---|---|
| domain | DocEngineeringContext | Three-layer doc rules |
| domain | VitePressContext | Doc site build constraints |

### scene: dev
> Dev scenario

| kind | name | description |
|---|---|---|
| domain | WorkOrchestrationContext | 8 stages + 6 workType |
| blueprint | dev-workflow | Generic development |

### scene: empty
> Empty scene
`

describe('parseRoadmapMdContent', () => {
  test('parses frontmatter fields', () => {
    const { roadmap, warnings } = parseRoadmapMdContent(SAMPLE_MD)
    expect(roadmap.name).toBe('oxn-system')
    expect(roadmap.version).toBe(1)
    expect(roadmap.abstract).toContain('Test abstract')
    // Empty scene produces warning; that's correct behavior
    const emptyWarning = warnings.find((w) => w.includes("'empty' has no links"))
    expect(emptyWarning).toBeDefined()
  })

  test('parses all 3 scenes', () => {
    const { roadmap } = parseRoadmapMdContent(SAMPLE_MD)
    expect(roadmap.scenes).toHaveLength(3)
    expect(roadmap.scenes.map((s) => s.name)).toEqual(['doc', 'dev', 'empty'])
  })

  test('parses scene description from blockquote', () => {
    const { roadmap } = parseRoadmapMdContent(SAMPLE_MD)
    expect(roadmap.scenes[0]?.description).toBe('Doc scenario')
    expect(roadmap.scenes[1]?.description).toBe('Dev scenario')
  })

  test('parses links in tables', () => {
    const { roadmap } = parseRoadmapMdContent(SAMPLE_MD)
    const docScene = roadmap.scenes[0]!
    expect(docScene.links).toHaveLength(2)
    expect(docScene.links[0]).toEqual({
      kind: 'domain',
      name: 'DocEngineeringContext',
      description: 'Three-layer doc rules',
    })
  })

  test('warns on empty scene', () => {
    const { warnings } = parseRoadmapMdContent(SAMPLE_MD)
    expect(warnings).toContain("Scene 'empty' has no links")
  })

  test('throws on missing name frontmatter', () => {
    expect(() => parseRoadmapMdContent('---\nentity: roadmap\n---\n\n# Roadmap: x\n\n## Scenes\n')).toThrow(
      /missing frontmatter name/,
    )
  })

  test('throws on wrong entity type', () => {
    expect(() => parseRoadmapMdContent('---\nentity: domain\nname: x\n---\n\n# Roadmap: x\n\n## Scenes\n')).toThrow(
      /entity must be 'roadmap'/,
    )
  })

  test('handles missing ## Scenes section with warning', () => {
    const md = `---
entity: roadmap
version: 1
name: empty-rd
---
# Roadmap: empty-rd
> nothing here
`
    const { roadmap, warnings } = parseRoadmapMdContent(md)
    expect(roadmap.scenes).toHaveLength(0)
    expect(warnings.some((w) => w.includes('## Scenes'))).toBe(true)
  })

  test('warns on invalid kind', () => {
    const md = `---
entity: roadmap
version: 1
name: bad-kind
---
# Roadmap: bad-kind

## Scenes

### scene: bad
> bad kind

| kind | name | description |
|---|---|---|
| invalid_kind | Foo | desc |
`
    const { warnings } = parseRoadmapMdContent(md)
    expect(warnings.some((w) => w.includes('invalid kind'))).toBe(true)
  })

  test('warns on missing table header columns', () => {
    const md = `---
entity: roadmap
version: 1
name: bad-cols
---
# Roadmap: bad-cols

## Scenes

### scene: bad
> bad cols

| wrong | headers |
|---|---|
| a | b |
`
    const { warnings } = parseRoadmapMdContent(md)
    expect(warnings.some((w) => w.includes('header should be'))).toBe(true)
  })
})
