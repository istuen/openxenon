/**
 * Asset module — create use case (v0.6 PR-5a)
 *
 * Creates a new Domain / Blueprint / Stack asset skeleton file.
 */
import { mkdirSync, writeFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { dirname } from 'path'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import type { CreateInput, CreateResult, AssetFormat } from './types'

function createDomainTemplate(name: string, format: AssetFormat): string {
  if (format === 'md') {
    return `---
entity: domain
version: 0.3.0
name: ${name}
---

# Domain: ${name}

> TODO: one-line description of the bounded context's business boundary

## Terms

### TODO_Term
- desc: TODO: domain term definition

## Bans

- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2

## Invariants

- value: TODO: business invariant rule 1
- value: TODO: business invariant rule 2
`
  }
  return `// Domain: ${name}
// Created by: oxn domain create ${name}
//
// DDD bounded context skeleton. After filling in term / ban / invariant,
// reference it from work.oxn via:
//   domain "${name}" ref "@prj/domains/${name}";

domain "${name}" {
  description = "TODO: one-line description of the bounded context's business boundary"

  term {
    "TODO_Term": "TODO: domain term definition"
  }

  ban { "TODO_BannedTerm1", "TODO_BannedTerm2" }

  invariant {
    "TODO: business invariant rule 1"
    "TODO: business invariant rule 2"
  }
}
`
}

function createBlueprintTemplate(name: string, format: AssetFormat, slots?: string[]): string {
  const slotList = slots?.length ? slots : ['build', 'test', 'verify']
  const slotBlocks = slotList.map((s) => `  slot "${s}" { deps = [] }`).join('\n')
  if (format === 'md') {
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
---

# Blueprint: ${name}

> TODO: one-line description of the technical pipeline

## Slots
${slotList.map((s) => `\n### ${s}\n- deps: []`).join('\n')}
`
  }
  return `// Blueprint: ${name}
blueprint "${name}" {
  description = "TODO: one-line description of the technical pipeline"
  version = 1
${slotBlocks}
}
`
}

function createStackTemplate(name: string): string {
  return `---
entity: stack
version: 0.3.0
name: ${name}
---

# Stack: ${name}

> TODO: one-line description of the technical environment constraints

## runtime
- language: typescript
- runtime: bun
- version: ">=1.1.0"

## linter
- tool: biome
- config: biome.json

## test
- runner: bun test
- coverage: "@oxn/probes/test-pass"
`
}

export async function create(input: CreateInput): Promise<CreateResult> {
  const kind = input.kind
  const format = input.format ?? 'oxn'
  const assetPath = resolveAssetFile(input.projectRoot, kind, input.name, format)

  if (existsSync(assetPath)) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset already exists: ${assetPath}`, {
      kind,
      name: input.name,
      path: assetPath,
    })
  }

  const dir = dirname(assetPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  let content: string
  switch (kind) {
    case 'domain':
      content = createDomainTemplate(input.name, format)
      break
    case 'blueprint':
      content = createBlueprintTemplate(input.name, format)
      break
    case 'stack':
      content = createStackTemplate(input.name)
      break
    default:
      throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `Unsupported asset kind: ${kind}`, {
        kind,
      })
  }

  writeFileSync(assetPath, content, 'utf-8')
  return { assetPath, content, createdAt: new Date().toISOString() }
}
