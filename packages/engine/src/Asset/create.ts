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
  assetVersion = 1
${slotBlocks}
}
`
}

function createStackTemplate(name: string): string {
  return `// Stack: ${name}
// Created by: oxn work create ${name} --type asset --asset-kind stack
//
// 技术栈约束骨架。runtime / linter / test 三类约束。

stack "${name}" {
  description = "TODO: one-line description of the technical environment constraints"

  runtime "typescript" {
    version = ">=5.0.0"
  }

  linter "biome" {
    config = "biome.json"
  }

  test "bun-test" {
    command = "bun test"
    coverage = "@oxn/probes/test-pass"
  }
}
`
}

function createLibraryTemplate(name: string): string {
  return `// Library: ${name}
// Created by: oxn work create ${name} --type asset --asset-kind library
//
// 文档聚合骨架。Sources H2 收集外部 SDK / wiki 文档抓取记录。

library "${name}" {
  description = "TODO: one-line description of the library's content scope"

  source "example-docs" {
    url = "https://example.com/docs"
    version = "1.0.0"
    fetched = "2026-07-08"
    summary = "TODO: describe the source content"
  }
}
`
}

function createExternalTemplate(name: string): string {
  return `// External: ${name}
// Created by: oxn work create ${name} --type asset --asset-kind external
//
// 外部资源链接骨架。Links H2 收集 API / 服务地址（需 TTL 刷新）。

external "${name}" {
  description = "TODO: one-line description of the external resource's purpose"

  link "payment-api" {
    url = "https://api.example.com/v1"
    kind = "rest-api"
    ttl = "7d"
    auth = "api-key"
    summary = "TODO: describe the external resource"
  }
}
`
}

export async function create(input: CreateInput): Promise<CreateResult> {
  const kind = input.kind
  const format = input.format ?? 'oxn'
  const force = input.force ?? false
  const assetPath = resolveAssetFile(input.projectRoot, kind, input.name, format)

  if (existsSync(assetPath) && !force) {
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
      content = createBlueprintTemplate(input.name, format, input.slots)
      break
    case 'stack':
      content = createStackTemplate(input.name)
      break
    case 'library':
      content = createLibraryTemplate(input.name)
      break
    case 'external':
      content = createExternalTemplate(input.name)
      break
    default:
      throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `Unsupported asset kind: ${kind}`, {
        kind,
      })
  }

  writeFileSync(assetPath, content, 'utf-8')
  return { assetPath, content, createdAt: new Date().toISOString() }
}
