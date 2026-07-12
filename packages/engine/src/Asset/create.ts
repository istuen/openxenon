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
// reference it from work.md via:
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

/**
 * 🆕 v0.6.1-alpha.2: Workflow 模板（原 Blueprint 改名）。
 * 语义不变：## Props + ## Slots。entity: workflow。
 */
function createWorkflowTemplate(name: string, format: AssetFormat, slots?: string[]): string {
  const slotList = slots?.length ? slots : ['build', 'test', 'verify']
  const slotBlocks = slotList.map((s) => `  slot "${s}" { deps = [] }`).join('\n')
  if (format === 'md') {
    return `---
entity: workflow
version: 0.3.0
name: ${name}
---

# Workflow: ${name}

> TODO: one-line description of the technical pipeline

## Slots
${slotList.map((s) => `\n### ${s}\n- deps: []`).join('\n')}
`
  }
  return `// Workflow: ${name}
workflow "${name}" {
  description = "TODO: one-line description of the technical pipeline"
  assetVersion = 1
${slotBlocks}
}
`
}

/**
 * 🆕 v0.6.1-alpha.2: 新 Blueprint = 组合模板（## Refs 引用 domain + workflow + stack + blueprint）。
 * 不再有 Props/Slots——组合的是其他 Asset。
 */
function createBlueprintTemplate(name: string, format: AssetFormat): string {
  if (format === 'md') {
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
abstract: TODO: one-line description of this composition template
---

# Blueprint: ${name}

> 组合模板：声明此工作所需的 Domain + Workflow + Stack + Blueprint 边界组合

## Refs
### domain-1
- kind: domain
- ref: @md/domains/YourDomain
### workflow-1
- kind: workflow
- ref: @md/workflows/YourWorkflow
### stack-1
- kind: stack
- ref: @md/stacks/YourStack
`
  }
  return `// Blueprint: ${name}
blueprint "${name}" {
  abstract = "TODO: one-line description of this composition template"
  assetVersion = 1
  domain "YourDomain" ref "@prj/domains/YourDomain";
  workflow "YourWorkflow" ref "@prj/workflows/YourWorkflow";
  stack "YourStack" ref "@prj/stack/YourStack";
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

function createRoadmapTemplate(name: string): string {
  return `// Roadmap: ${name}
// Created by: oxn work create ${name} --type asset --asset-kind roadmap
//
// 路线图骨架。Roadmap 是简化版 Asset，仅含 links 分类
// （不参与 references[] DAG 校验）。
// link 语法：裸字符串 target (RoadmapLink 是 unnamed rule，无需前缀)
// target 引用其他 Asset 路径（@prj/domains/X 或 @prj/blueprints/Y）

roadmap "${name}" {
  abstract = "TODO: one-line description of the roadmap's scope"

  "@prj/domains/MemberContext"
  "@prj/blueprints/dev-workflow"
}
`
}

// 🆕 v0.6.1-alpha.2: library / external Asset 类型已删除（收敛到 Domain/Workflow/Stack 边界内 inline 声明）
//   - library 用途（已索引外部文档）→ .openxenon/libraries/*.md 文件 + Domain 的 ## Externals (kind: library) 引用
//   - external 用途（网络资源指针）→ 边界类型 ## Externals H2 category（url 字段）
// 模板函数 createLibraryTemplate / createExternalTemplate 已删除

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
      // 🆕 v0.6.1-alpha.2: 新 Blueprint = 组合模板（## Refs 引用 domain + workflow + stack + blueprint）
      content = createBlueprintTemplate(input.name, format)
      break
    case 'workflow':
      // 🆕 v0.6.1-alpha.2: 原 blueprint 改名（## Props + ## Slots）
      content = createWorkflowTemplate(input.name, format, input.slots)
      break
    case 'stack':
      content = createStackTemplate(input.name)
      break
    case 'roadmap':
      content = createRoadmapTemplate(input.name)
      break
    default:
      throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `Unsupported asset kind: ${kind}`, {
        kind,
      })
  }

  writeFileSync(assetPath, content, 'utf-8')
  return { assetPath, content, createdAt: new Date().toISOString() }
}
