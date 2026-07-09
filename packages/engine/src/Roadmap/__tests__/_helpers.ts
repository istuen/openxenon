/**
 * Roadmap test helpers
 */

import { writeFileSync } from 'node:fs'
import type { RoadmapScene } from '../types.js'

export function writeRoadmapMd(path: string, scenes: RoadmapScene[]): void {
  const frontmatter = `---
entity: roadmap
version: 1
name: test-rd
abstract: |
  Test roadmap
---

# Roadmap: test-rd

> Test

## Scenes
`
  const scenesMd = scenes
    .map((s) => {
      const tableRows = s.links.map((l) => `| ${l.kind} | ${l.name} | ${l.description} |`).join('\n')
      return `### scene: ${s.name}
> ${s.description}

| kind | name | description |
|---|---|---|
${tableRows}
`
    })
    .join('\n')
  writeFileSync(path, frontmatter + scenesMd, 'utf-8')
}
