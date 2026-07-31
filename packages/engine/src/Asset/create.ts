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
import type { ProjectConfig } from '@openxenon/engine/infra/paths'

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
 * v0.7+ canonical: Workflow = 执行边界，输出 ## Slots 下 ### <name> + - desc: 字段。
 * 移除 ## Props 中的 deps / observe（v0.6 残留）；删除 ## Externals 段。
 */
function createWorkflowTemplate(name: string, format: AssetFormat, slots?: string[]): string {
  const slotList = slots?.length ? slots : ['analyze', 'implement', 'verify']
  const slotBlocks = slotList.map((s) => `  slot "${s}" { deps = [] }`).join('\n')
  if (format === 'md') {
    return `---
entity: workflow
version: 0.3.0
name: ${name}
---

# Workflow: ${name}

> TODO: one-line description of this execution flow

## Slots

${slotList.map((s) => `### ${s}\n- desc: TODO: ${s} 阶段要做什么`).join('\n\n')}
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
 * v0.7+ canonical: Blueprint = 组合模板，输出 ## Use 段（kind: domain/workflow/stack）
 * + ## Boundaries 段（### <boundary> with refs/observe/deps）。
 * 不再有 ## Refs / ## Props / ## Slots。
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

> 组合模板：声明此工作所需的 Domain + Workflow + Stack 边界组合

## Use
### domain-1
- kind: domain
- ref: @md/domains/YourDomain
### workflow-1
- kind: workflow
- ref: @md/workflows/YourWorkflow
### stack-1
- kind: stack
- ref: @md/stacks/YourStack

## Boundaries

### build
- refs:
  - domain: domain-1
  - workflow: workflow-1
  - stack: stack-1
- observe:
  - ts-compiles
- deps: []

### test
- refs:
  - domain: domain-1
  - workflow: workflow-1
  - stack: stack-1
- observe:
  - test-pass
- deps:
  - build
`
  }
  // .oxn fallback（保留向后兼容）
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

/**
 * v0.7+ canonical: Stack = 环境边界，输出 ## Tools 段（### <tool> with version / config / command）。
 * 删除 v0.6 的 ## Runtimes / ## Linters / ## Tests / ## Externals 旧段；Stack 极简，
 * 只保留 .md 单一格式。
 */
function createStackTemplate(name: string): string {
  return `---
entity: stack
version: 0.3.0
name: ${name}
abstract: TODO: one-line description of the tech stack
---

# Stack: ${name}

> TODO: one-line description of this tech stack

## Tools

### typescript
- version: ">=5.0.0"

### node
- version: ">=20.0.0"

### biome
- config: "biome.json"

### bun-test
- command: "bun test"
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

export async function create(input: CreateInput, config?: ProjectConfig | null): Promise<CreateResult> {
  const kind = input.kind
  const format = input.format ?? 'oxn'
  const force = input.force ?? false
  const assetPath = resolveAssetFile(input.projectRoot, kind, input.name, format, config)

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
      // v0.7+ canonical: Blueprint 输出 ## Use + ## Boundaries 段
      content = createBlueprintTemplate(input.name, format)
      break
    case 'workflow':
      // v0.7+ canonical: Workflow 输出 ## Slots 下 ### <slot> + - desc 字段
      content = createWorkflowTemplate(input.name, format, input.slots)
      break
    case 'stack':
      // v0.7+ canonical: Stack 输出 ## Tools 段（极简 .md 单一格式）
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
