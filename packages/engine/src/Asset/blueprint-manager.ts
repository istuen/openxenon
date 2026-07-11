import { existsSync } from '@openxenon/engine/infra/filesystem'
import type { AssetFormat, ProjectConfig } from '@openxenon/engine/infra/paths'
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import { getBlueprintIndexPath, writeBlueprintIndex } from '@openxenon/engine/oxl/compiler/blueprint-index-builder'

type BlueprintFormat = AssetFormat

export function blueprintCreateTemplate(
  name: string,
  slotsBlock: string,
  _slotsArg: string,
  format: BlueprintFormat,
): string {
  if (format === 'md') {
    const slotNames: string[] = []
    for (const line of slotsBlock.split('\n')) {
      const m = line.match(/^ {2}slot "([^"]+)" \{/)
      if (m) slotNames.push(m[1]!)
    }
    const mdSlots = slotNames.map((slotName) => `### ${slotName}\n- deps: []`).join('\n\n')
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
---

# Blueprint: ${name}

> TODO: one-line description of what this blueprint does

## Slots

${mdSlots}
`
  }
  // v0.7.0+: .oxn format no longer supported, always return .md template
  const slotNames: string[] = []
  for (const line of slotsBlock.split('\n')) {
    const m = line.match(/^ {2}slot "([^"]+)" \{/)
    if (m) slotNames.push(m[1]!)
  }
  const mdSlots = slotNames.map((slotName) => `### ${slotName}\n- deps: []`).join('\n\n')
  return `---
entity: blueprint
version: 0.3.0
name: ${name}
---

# Blueprint: ${name}

> TODO: one-line description of what this blueprint does

## Slots

${mdSlots}
`
}

export function autoRebuildBlueprintIndex(
  projectRoot: string,
  config?: ProjectConfig,
): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    const blueprintsDir = resolveAssetDir(projectRoot, 'blueprint', config ?? null)
    if (!existsSync(blueprintsDir)) return { ok: true }
    const outPath = getBlueprintIndexPath(projectRoot)
    writeBlueprintIndex({ projectRoot, blueprintsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
