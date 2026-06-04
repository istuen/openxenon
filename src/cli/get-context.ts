import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, DOMAINS_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'

// =============================================================================
// `oxn get-context` — v0.1 AI 上下文获取
//
// 加载 task.oxn + work.oxn + 注入的 domain.oxn，返回给 AI 的最小工作上下文。
// 关键约束（v0.1 决策）：
//   - **全量隔离**：只返回 task 自己 inject 的 domain，不返回其他 task 的
//   - language 约束作为 "allowedLanguage" 字段注入，AI 看到的提示中只能使用这些词
//   - 自动生成 .openxenon/works/<name>/CONTEXT.md 人类可读摘要
//   - 同时支持 --work (legacy 兼容) 和 --work + --task (v0.1)
// =============================================================================

function getProjectRoot(): string {
  return process.cwd()
}

function readDomainFile(filePath: string): {
  name: string
  description?: string
  language?: {
    nouns: Array<{ name: string; desc: string }>
    verbs: Array<{ name: string; desc: string }>
    ban: string[]
  }
  rules?: Array<{ name: string; desc: string }>
  contextMap?: Array<{ target: string; alias: string }>
} | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  // 简易同步 regex 抽取 domain 数据
  const nameMatch = content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch) return null

  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const langBlock = content.match(/language\s*\{([\s\S]*?)\}/)
  const rulesBlock = content.match(/domain_rules\s*\{([\s\S]*?)\}/)
  const mapBlock = content.match(/context_map\s*\{([\s\S]*?)\}/)

  function extractLang(block: string | undefined) {
    if (!block) return undefined
    const nouns = Array.from(block.matchAll(/noun\s+"([^"]+)"\s+desc\s+"((?:[^"\\]|\\.)*)"/g)).map((m) => ({
      name: m[1]!,
      desc: m[2]!.replace(/\\"/g, '"'),
    }))
    const verbs = Array.from(block.matchAll(/verb\s+"([^"]+)"\s+desc\s+"((?:[^"\\]|\\.)*)"/g)).map((m) => ({
      name: m[1]!,
      desc: m[2]!.replace(/\\"/g, '"'),
    }))
    const banMatch = block.match(/ban\s*=\s*\[([^\]]*)\]/)
    const ban = banMatch ? Array.from(banMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []
    return { nouns, verbs, ban }
  }

  function extractRules(block: string | undefined) {
    if (!block) return undefined
    return Array.from(block.matchAll(/rule\s+"([^"]+)"\s+desc\s+"((?:[^"\\]|\\.)*)"/g)).map((m) => ({
      name: m[1]!,
      desc: m[2]!.replace(/\\"/g, '"'),
    }))
  }

  function extractMap(block: string | undefined) {
    if (!block) return undefined
    return Array.from(block.matchAll(/imports\s+"([^"]+)"\s+as\s+"([^"]+)"/g)).map((m) => ({
      target: m[1]!,
      alias: m[2]!,
    }))
  }

  return {
    name: nameMatch[1]!,
    ...(descMatch ? { description: descMatch[1]!.replace(/\\"/g, '"') } : {}),
    ...(extractLang(langBlock?.[1]) ? { language: extractLang(langBlock![1])! } : {}),
    ...(extractRules(rulesBlock?.[1]) ? { rules: extractRules(rulesBlock![1])! } : {}),
    ...(extractMap(mapBlock?.[1]) ? { contextMap: extractMap(mapBlock![1])! } : {}),
  }
}

function readTaskFile(filePath: string): {
  name: string
  blueprint: string
  injects: string[]
  objective?: string
  constraints: string[]
  slots: Array<{ name: string; deps: string[]; observe: string[] }>
} | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/task\s+"([^"]+)"\s+blueprint\s+"([^"]+)"/)
  if (!nameMatch) return null

  const injects = Array.from(content.matchAll(/inject\s+"([^"]+)"/g)).map((m) => m[1]!)

  // 抽取 context
  const ctxBlock = content.match(/context\s*\{([\s\S]*?)\}/)
  let objective: string | undefined
  let constraints: string[] = []
  if (ctxBlock) {
    const objMatch = ctxBlock[1]!.match(/objective\s*=\s*"((?:[^"\\]|\\.)*)"/)
    if (objMatch) objective = objMatch[1]!.replace(/\\"/g, '"')
    const conMatch = ctxBlock[1]!.match(/constraints\s*=\s*\[([^\]]*)\]/)
    if (conMatch) {
      constraints = Array.from(conMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
    }
  }

  // 抽取 slot 列表
  const slots: Array<{ name: string; deps: string[]; observe: string[] }> = []
  const slotBlocks = Array.from(content.matchAll(/slot\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of slotBlocks) {
    const name = m[1]!
    const body = m[2]!
    const depsMatch = body.match(/deps\s*=\s*\[([^\]]*)\]/)
    const deps = depsMatch ? Array.from(depsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []
    const observeMatch = body.match(/observe\s*=\s*\[([^\]]*)\]/)
    const observe = observeMatch ? Array.from(observeMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []
    slots.push({ name, deps, observe })
  }

  return { name: nameMatch[1]!, blueprint: nameMatch[2]!, injects, objective, constraints, slots }
}

function readWorkFile(filePath: string): {
  name: string
  goal?: string
  constraints: string[]
  domains: string[]
  blueprints: string[]
  tasks: Array<{ name: string; align: string; deps: string[] }>
} | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/work\s+"([^"]+)"/)
  if (!nameMatch) return null

  const domains = Array.from(content.matchAll(/use_domain\s+"([^"]+)"/g)).map((m) => m[1]!)
  const blueprints = Array.from(content.matchAll(/use_blueprint\s+"([^"]+)"/g)).map((m) => m[1]!)

  const ctxBlock = content.match(/context\s*\{([\s\S]*?)\}/)
  let goal: string | undefined
  let constraints: string[] = []
  if (ctxBlock) {
    const gMatch = ctxBlock[1]!.match(/goal\s*=\s*"((?:[^"\\]|\\.)*)"/)
    if (gMatch) goal = gMatch[1]!.replace(/\\"/g, '"')
    const cMatch = ctxBlock[1]!.match(/constraints\s*=\s*\[([^\]]*)\]/)
    if (cMatch) {
      constraints = Array.from(cMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
    }
  }

  const tasks: Array<{ name: string; align: string; deps: string[] }> = []
  const taskBlocks = Array.from(content.matchAll(/task\s+"([^"]+)"\s+align\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of taskBlocks) {
    const name = m[1]!
    const align = m[2]!
    const body = m[3]!
    const depsMatch = body.match(/deps\s*=\s*\[([^\]]*)\]/)
    const deps = depsMatch ? Array.from(depsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []
    tasks.push({ name, align, deps })
  }

  return { name: nameMatch[1]!, goal, constraints, domains, blueprints, tasks }
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'get-context',
    description: '返回 AI 可见的 task 工作上下文 (work.oxn + task.oxn + 注入的 domains)',
  },
  args: {
    work: { type: 'string', required: true, description: 'Work 名称' },
    task: { type: 'string', description: 'Task 名称（v0.1 推荐；不传则返回 work 级上下文）' },
    'state-path': { type: 'string', description: '可选，state.json 路径（用于 currentFocus）' },
    'emit-md': {
      type: 'string',
      description: '可选，把摘要写到指定 .md 路径（如 .openxenon/works/<name>/CONTEXT.md）',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.work as string
    const taskName = ctx.args.task as string | undefined
    const statePathArg = ctx.args['state-path'] as string | undefined
    const emitMdPath = ctx.args['emit-md'] as string | undefined
    const root = getProjectRoot()

    const workFile = join(root, BOUNDARY_DIR, 'works', workName, 'work.oxn')
    if (!existsSync(workFile)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `work "${workName}" not found at ${workFile}`,
        },
        format,
      )
    }
    const work = readWorkFile(workFile)
    if (!work) {
      return outputError({ code: 'OXN_DSL_PARSE_FAILED', message: `Failed to parse ${workFile}` }, format)
    }

    // v0.1 上下文隔离核心：只加载 task 自己 inject 的 domain
    const injectedDomains: Array<{ name: string; data: NonNullable<ReturnType<typeof readDomainFile>> }> = []
    if (taskName) {
      const taskFile = join(root, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, 'task.oxn')
      if (!existsSync(taskFile)) {
        return outputError(
          { code: 'OXN_TASK_NOT_FOUND', message: `task "${taskName}" not found in work "${workName}"` },
          format,
        )
      }
      const task = readTaskFile(taskFile)
      if (!task) {
        return outputError({ code: 'OXN_DSL_PARSE_FAILED', message: `Failed to parse ${taskFile}` }, format)
      }

      // 全量隔离：只加载 task.injects 中的 domain
      // 文件名兼容：Domain 名是 PascalCase，但 .oxn 文件可能是 kebab-case
      for (const dom of task.injects) {
        const kebab = dom
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/_/g, '-')
          .toLowerCase()
        const candidates = [
          join(root, BOUNDARY_DIR, DOMAINS_DIR, `${dom}.oxn`),
          join(root, BOUNDARY_DIR, DOMAINS_DIR, `${kebab}.oxn`),
        ]
        let domData: ReturnType<typeof readDomainFile> = null
        for (const path of candidates) {
          domData = readDomainFile(path)
          if (domData) break
        }
        if (domData) {
          injectedDomains.push({ name: dom, data: domData })
        }
      }

      // 加载 task state
      const statePath = statePathArg ?? join(root, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, 'state.json')
      let currentFocus: string | null = task.slots[0]?.name ?? null
      let taskStatus = 'pending'
      if (existsSync(statePath)) {
        try {
          const state = JSON.parse(readFileSync(statePath, 'utf-8'))
          if (state.currentPart) currentFocus = state.currentPart
          if (state.status) taskStatus = state.status
        } catch {
          // ignore
        }
      }

      // 汇总 allowedLanguage
      const allowedNouns: string[] = []
      const allowedVerbs: string[] = []
      const banned: string[] = []
      for (const { data } of injectedDomains) {
        if (data.language) {
          allowedNouns.push(...data.language.nouns.map((n) => n.name))
          allowedVerbs.push(...data.language.verbs.map((v) => v.name))
          banned.push(...data.language.ban)
        }
      }

      // 汇总 domain rules（仅文档化）
      const domainRules: Array<{ domain: string; name: string; desc: string }> = []
      for (const { name, data } of injectedDomains) {
        if (data.rules) {
          for (const r of data.rules) {
            domainRules.push({ domain: name, name: r.name, desc: r.desc })
          }
        }
      }

      const context = {
        workspace: workName,
        task: taskName,
        blueprint: task.blueprint,
        currentPart: currentFocus,
        taskStatus,
        workContext: {
          overallGoal: work.goal ?? '',
          constraints: work.constraints,
        },
        taskContext: {
          objective: task.objective ?? '',
          constraints: task.constraints,
        },
        // v0.1 关键：只返回 task 自己 inject 的 domain（**全量隔离**）
        injectedDomains: injectedDomains.map(({ name, data }) => ({
          name,
          ...(data.description ? { description: data.description } : {}),
          ...(data.language
            ? {
                language: {
                  nouns: data.language.nouns,
                  verbs: data.language.verbs,
                  ban: data.language.ban,
                },
              }
            : {}),
          rules: data.rules ?? [],
        })),
        // AI prompt 直接消费
        allowedLanguage: {
          mustUseNouns: allowedNouns,
          mustUseVerbs: allowedVerbs,
          banned,
        },
        domainRules,
        taskSlots: task.slots,
        // 提示给 AI：未列出的 domain 一律不知
        isolationNotice: '本 task 只能看到 inject 列表中的 domain，work 中其他 domain 一律不可见。',
      }

      // 可选：生成 CONTEXT.md
      if (emitMdPath) {
        const md = renderContextMd(context)
        const { writeFileSync } = require('fs') as typeof import('fs')
        writeFileSync(emitMdPath, md, 'utf-8')
      }

      return output(
        {
          ok: true,
          data: context,
          human: renderContextHuman(context),
        },
        format,
      )
    }

    // 没传 task：返回 work 级上下文（不含 task 隔离）
    const workInjectedDomains: Array<{ name: string; data: NonNullable<ReturnType<typeof readDomainFile>> }> = []
    for (const dom of work.domains) {
      const domFile = join(root, BOUNDARY_DIR, DOMAINS_DIR, `${dom}.oxn`)
      const domData = readDomainFile(domFile)
      if (domData) workInjectedDomains.push({ name: dom, data: domData })
    }

    return output(
      {
        ok: true,
        data: {
          workspace: workName,
          level: 'work',
          workContext: {
            overallGoal: work.goal ?? '',
            constraints: work.constraints,
          },
          domains: workInjectedDomains.map(({ name, data }) => ({
            name,
            ...(data.description ? { description: data.description } : {}),
            ...(data.language ? { hasLanguage: true } : {}),
          })),
          blueprints: work.blueprints,
          tasks: work.tasks,
        },
        human: `Work ${workName} (no --task specified, returning workspace-level context)
  Domains:  ${work.domains.join(', ')}
  Blueprints: ${work.blueprints.join(', ')}
  Tasks:    ${work.tasks.length}
  (传 --task <name> 获取 task 级隔离上下文)`,
      },
      format,
    )
  },
})

function renderContextHuman(c: {
  workspace: string
  task: string
  blueprint: string
  currentPart: string | null
  taskStatus: string
  workContext: { overallGoal: string; constraints: string[] }
  taskContext: { objective: string; constraints: string[] }
  injectedDomains: Array<{ name: string; description?: string; language?: unknown; rules: unknown[] }>
  allowedLanguage: { mustUseNouns: string[]; mustUseVerbs: string[]; banned: string[] }
  domainRules: Array<{ domain: string; name: string; desc: string }>
  taskSlots: Array<{ name: string; deps: string[]; observe: string[] }>
  isolationNotice: string
}): string {
  const lines: string[] = []
  lines.push(`# Context for ${c.workspace} / ${c.task}`)
  lines.push('')
  lines.push(`Blueprint: ${c.blueprint}`)
  lines.push(`Current part: ${c.currentPart ?? '(none)'}`)
  lines.push(`Status: ${c.taskStatus}`)
  lines.push('')
  lines.push('## Work-level')
  lines.push(`Goal: ${c.workContext.overallGoal}`)
  if (c.workContext.constraints.length > 0) {
    lines.push('Constraints:')
    for (const x of c.workContext.constraints) lines.push(`  - ${x}`)
  }
  lines.push('')
  lines.push('## Task-level')
  lines.push(`Objective: ${c.taskContext.objective}`)
  if (c.taskContext.constraints.length > 0) {
    lines.push('Constraints:')
    for (const x of c.taskContext.constraints) lines.push(`  - ${x}`)
  }
  lines.push('')
  lines.push('## Injected Domains (isolated)')
  for (const d of c.injectedDomains) {
    lines.push(`### ${d.name}`)
    if (d.description) lines.push(d.description)
    if (
      Array.isArray((d.language as { nouns?: unknown[] })?.nouns) &&
      (d.language as { nouns: unknown[] }).nouns.length > 0
    ) {
      lines.push('Nouns: ' + (d.language as { nouns: Array<{ name: string }> }).nouns.map((n) => n.name).join(', '))
    }
  }
  lines.push('')
  lines.push('## Allowed Language')
  lines.push(`Nouns (must use): ${c.allowedLanguage.mustUseNouns.join(', ') || '(none)'}`)
  lines.push(`Verbs (must use): ${c.allowedLanguage.mustUseVerbs.join(', ') || '(none)'}`)
  if (c.allowedLanguage.banned.length > 0) {
    lines.push(`Banned:          ${c.allowedLanguage.banned.join(', ')}`)
  }
  if (c.domainRules.length > 0) {
    lines.push('')
    lines.push('## Domain Rules (documentation only in v0.1)')
    for (const r of c.domainRules) {
      lines.push(`- [${r.domain}] ${r.name}: ${r.desc}`)
    }
  }
  lines.push('')
  lines.push(`## ${c.isolationNotice}`)
  return lines.join('\n')
}

function renderContextMd(c: ReturnType<typeof Object>): string {
  return renderContextHuman(c as Parameters<typeof renderContextHuman>[0])
}
