import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'

// =============================================================================
// `oxn work task` — v0.1 Task 生命周期管理
//
// 一个 task 归属于一个 work（在 .openxenon/works/<work-name>/tasks/<task-name>/task.oxn）
// 一个 task 绑定一份 Blueprint（从 work.oxn 的 use_blueprint 列表中挑选）
// 一个 task 注入若干 Domain（从 work.oxn 的 use_domain 列表中挑选）
//
// 子命令：
//   new      — 在 work 下创建 task.oxn
//   status   — 查看 task 状态
//   list     — 列出 work 下所有 task
// =============================================================================

function getProjectRoot(): string {
  return process.cwd()
}

function getWorkTaskDir(workName: string, taskName: string): string {
  return join(getProjectRoot(), BOUNDARY_DIR, 'works', workName, 'tasks', taskName)
}

function getWorkTaskFile(workName: string, taskName: string): string {
  return join(getWorkTaskDir(workName, taskName), 'task.oxn')
}

function getWorkFile(workName: string): string {
  return join(getProjectRoot(), BOUNDARY_DIR, 'works', workName, 'work.oxn')
}

function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}
void toKebab

function validateName(name: string, label: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: `${label} is required` }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return {
      valid: false,
      error: `${label} must start with a letter and contain only letters/digits/dashes/underscores`,
    }
  }
  return { valid: true }
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// Subcommand: new
// ---------------------------------------------------------------------------
const newSubcommand = defineCommand({
  meta: {
    name: 'new',
    description: '在指定 work 下创建新的 task.oxn（绑定一份 Blueprint + 注入若干 Domain）',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    'task-name': { type: 'string', required: true, description: 'Task 名称（kebab-case 推荐）' },
    blueprint: {
      type: 'string',
      required: true,
      description: 'Blueprint 名（必须出现在 work.oxn 的 use_blueprint 列表中）',
    },
    inject: {
      type: 'string',
      description: '要注入的 Domain 名（逗号分隔），必须出现在 work.oxn 的 use_domain 列表中',
    },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在的 task.oxn' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args['task-name'] as string
    const blueprintName = ctx.args.blueprint as string
    const injectArg = (ctx.args.inject as string | undefined) ?? ''
    const force = ctx.args.force === true || ctx.args.f === true

    const workNameCheck = validateName(workName, 'work-name')
    if (!workNameCheck.valid) {
      return outputError({ code: 'OXN_INVALID_NAME', message: workNameCheck.error! }, format)
    }
    const taskNameCheck = validateName(taskName, 'task-name')
    if (!taskNameCheck.valid) {
      return outputError({ code: 'OXN_INVALID_NAME', message: taskNameCheck.error! }, format)
    }

    const workFile = getWorkFile(workName)
    if (!existsSync(workFile)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `work "${workName}" not found (work.oxn does not exist at ${workFile})`,
          suggestion: 'create the work first with `oxn work init` or `oxn leader new`',
        },
        format,
      )
    }

    const taskDir = getWorkTaskDir(workName, taskName)
    const taskFile = getWorkTaskFile(workName, taskName)
    if (existsSync(taskFile) && !force) {
      return outputError(
        {
          code: 'OXN_OUTPUT_FILE_EXISTS',
          message: `task.oxn already exists at ${taskFile}`,
          suggestion: 'use --force to overwrite',
        },
        format,
      )
    }

    // 解析 work.oxn 抽取 use_blueprint / use_domain 列表
    // v0.1: 用同步 regex 抽取（work.oxn 文件结构简单）
    let allowedBlueprints: string[] = []
    let allowedDomains: string[] = []
    try {
      const workContent = readFileSync(workFile, 'utf-8')
      const bpMatches = Array.from(workContent.matchAll(/use_blueprint\s+"([^"]+)"/g))
      const dMatches = Array.from(workContent.matchAll(/use_domain\s+"([^"]+)"/g))
      allowedBlueprints = bpMatches.map((m) => m[1]!)
      allowedDomains = dMatches.map((m) => m[1]!)
    } catch {
      // 软降级
    }

    if (allowedBlueprints.length > 0 && !allowedBlueprints.includes(blueprintName)) {
      return outputError(
        {
          code: 'OXN_BLUEPRINT_NOT_IN_WORK',
          message: `blueprint "${blueprintName}" not declared in work "${workName}" (allowed: ${allowedBlueprints.join(', ')})`,
          suggestion: `add 'use_blueprint "${blueprintName}";' to ${workFile}`,
        },
        format,
      )
    }

    const injects = injectArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const inj of injects) {
      if (allowedDomains.length > 0 && !allowedDomains.includes(inj)) {
        return outputError(
          {
            code: 'OXN_DOMAIN_NOT_IN_WORK',
            message: `domain "${inj}" not declared in work "${workName}" (allowed: ${allowedDomains.join(', ')})`,
            suggestion: `add 'use_domain "${inj}";' to ${workFile}`,
          },
          format,
        )
      }
    }

    // 生成 task.oxn 骨架
    const injectLines = injects.map((d) => `  inject "${d}";`).join('\n')
    const template = `// Task: ${taskName} (work: ${workName}, blueprint: ${blueprintName})
// Created by: oxn work task new --work-name ${workName} --task-name ${taskName} --blueprint ${blueprintName} ${injects.length > 0 ? `--inject ${injects.join(',')}` : ''}
//
// 任务执行：
//   oxn work task status --work-name ${workName} --task-name ${taskName}
//
// Skill 上下文获取（v0.1）：
//   oxn get-context --work ${workName} --task ${taskName}

task "${taskName}" blueprint "${blueprintName}" {
${injectLines}
  context {
    objective = "TODO: 描述这个 task 要达成的目标"
    constraints = [
      "TODO: 列出硬约束"
    ]
  }

  // 引用 ${blueprintName} 的 slot，作为 task 的步骤
  slot "develop" {
    deps = []
  }
  slot "test" {
    deps = ["develop"]
  }
}
`
    ensureDirectory(taskDir)
    writeFileSync(taskFile, template, 'utf-8')

    output(
      {
        ok: true,
        data: {
          workName,
          taskName,
          blueprint: blueprintName,
          injects,
          path: taskFile,
        },
        human: `Created task ${taskName} in work ${workName} at ${taskFile}\nBlueprint: ${blueprintName}\nInjects: ${injects.length > 0 ? injects.join(', ') : '(none)'}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: status
// ---------------------------------------------------------------------------
const statusSubcommand = defineCommand({
  meta: {
    name: 'status',
    description: '查看 task 状态（task.oxn 解析 + 注入的 domain/blueprint）',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    'task-name': { type: 'string', required: true, description: 'Task 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args['task-name'] as string
    const taskFile = getWorkTaskFile(workName, taskName)

    if (!existsSync(taskFile)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.oxn not found at ${taskFile}` }, format)
    }

    // 简易同步解析：直接用 regex 抽 blueprint 和 inject 字段
    const content = readFileSync(taskFile, 'utf-8')
    const blueprintMatch = content.match(/task\s+"[^"]+"\s+blueprint\s+"([^"]+)"/)
    const blueprint = blueprintMatch?.[1]
    const injects = Array.from(content.matchAll(/inject\s+"([^"]+)"/g)).map((m) => m[1]!)
    const taskNameMatch = content.match(/task\s+"([^"]+)"/)
    const parsedName = taskNameMatch?.[1]

    output(
      {
        ok: true,
        data: {
          workName,
          taskName: parsedName ?? taskName,
          blueprint,
          injects,
          file: taskFile,
        },
        human: `Task ${taskName} (work: ${workName})
  Blueprint: ${blueprint ?? '(none)'}
  Injects:   ${injects.length > 0 ? injects.join(', ') : '(none)'}
  File:      ${taskFile}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: '列出 work 下所有 task',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const tasksDir = join(getProjectRoot(), BOUNDARY_DIR, 'works', workName, 'tasks')

    if (!existsSync(tasksDir)) {
      return output(
        {
          ok: true,
          data: { tasks: [] },
          human: `No tasks in work "${workName}". Run \`oxn work task new\` to create one.`,
        },
        format,
      )
    }

    const { readdirSync } = require('fs') as typeof import('fs')
    const dirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const tasks = dirs
      .map((name) => {
        const file = join(tasksDir, name, 'task.oxn')
        if (!existsSync(file)) return null
        const content = readFileSync(file, 'utf-8')
        const blueprintMatch = content.match(/task\s+"[^"]+"\s+blueprint\s+"([^"]+)"/)
        const injects = Array.from(content.matchAll(/inject\s+"([^"]+)"/g)).map((m) => m[1]!)
        return {
          name,
          blueprint: blueprintMatch?.[1],
          injects,
        }
      })
      .filter((t) => t !== null)

    output(
      {
        ok: true,
        data: { tasks },
        human:
          tasks.length > 0
            ? `Tasks in work "${workName}":\n${tasks.map((t) => `  - ${t.name} (blueprint: ${t.blueprint ?? '?'}, injects: ${t.injects.length > 0 ? t.injects.join(', ') : 'none'})`).join('\n')}`
            : `No tasks in work "${workName}".`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: edit
// ---------------------------------------------------------------------------
const editSubcommand = defineCommand({
  meta: {
    name: 'edit',
    description: '编辑 task.oxn（objective / constraints / inject / slot）',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    'task-name': { type: 'string', required: true, description: 'Task 名称' },
    objective: { type: 'string', description: '新的 objective 文本' },
    'add-constraint': { type: 'string', description: '添加一条 constraint（可多次）' },
    'add-inject': { type: 'string', description: '添加 inject（必须已在 work.oxn use_domain 中）' },
    json: { type: 'boolean', description: 'JSON 格式输出' },
    yaml: { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args['task-name'] as string
    const newObjective = ctx.args.objective as string | undefined
    const addConstraint = (ctx.args['add-constraint'] as string | undefined) ?? ''
    const addInject = (ctx.args['add-inject'] as string | undefined) ?? ''

    const taskFile = getWorkTaskFile(workName, taskName)
    if (!existsSync(taskFile)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.oxn not found at ${taskFile}` }, format)
    }
    let content = readFileSync(taskFile, 'utf-8')

    if (newObjective !== undefined) {
      // 替换 context.objective
      const replaced = content.replace(
        /objective\s*=\s*"((?:[^"\\]|\\.)*)"/,
        `objective = "${newObjective.replace(/"/g, '\\"')}"`,
      )
      if (replaced === content) {
        return outputError(
          {
            code: 'OXN_EDIT_NO_OBJECTIVE',
            message: 'task.oxn has no objective field; cannot update',
          },
          format,
        )
      }
      content = replaced
    }

    if (addConstraint) {
      const newConstraint = addConstraint.replace(/"/g, '\\"')
      // 在 constraints 数组末尾追加
      const re = /(constraints\s*=\s*\[)([^\]]*?)(\])/m
      if (re.test(content)) {
        content = content.replace(re, (_m, head, body, tail) => {
          if (body.trim() === '') {
            return `${head}"${newConstraint}"${tail}`
          }
          // 去掉尾部逗号补上新条目
          const newBody =
            body.trimEnd().endsWith(',') || body.trimEnd() === ''
              ? `${body} "${newConstraint}",`
              : `${body}, "${newConstraint}",`
          return `${head}${newBody} ${tail}`
        })
      } else {
        // 没有 constraints 块就在 context 块内插入
        content = content.replace(
          /(context\s*\{)([^}]*?)(\})/m,
          (_m, head, body, tail) => `${head}\n    constraints = ["${newConstraint}"];${body}${tail}`,
        )
      }
    }

    if (addInject) {
      // 校验 addInject 出现在 work.oxn 的 use_domain
      const workFile = join(getProjectRoot(), BOUNDARY_DIR, 'works', workName, 'work.oxn')
      if (existsSync(workFile)) {
        const workContent = readFileSync(workFile, 'utf-8')
        const allowed = Array.from(workContent.matchAll(/use_domain\s+"([^"]+)"/g)).map((m) => m[1]!)
        if (allowed.length > 0 && !allowed.includes(addInject)) {
          return outputError(
            {
              code: 'OXN_DOMAIN_NOT_IN_WORK',
              message: `domain "${addInject}" not declared in work "${workName}" (allowed: ${allowed.join(', ')})`,
              suggestion: `add 'use_domain "${addInject}";' to ${workFile}`,
            },
            format,
          )
        }
      }
      // 在 inject 段末尾追加
      if (/\binject\b/.test(content)) {
        content = content.replace(/(\binject\s+"[^"]+";)/, `$1\n  inject "${addInject}";`)
      } else {
        // 在 task 块起始插入
        content = content.replace(/(task\s+"[^"]+"\s+blueprint\s+"[^"]+"\s*\{)/, `$1\n  inject "${addInject}";`)
      }
    }

    writeFileSync(taskFile, content, 'utf-8')
    output(
      {
        ok: true,
        data: { workName, taskName, file: taskFile, edited: true },
        human: `Edited task.oxn at ${taskFile}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: delete
// ---------------------------------------------------------------------------
const deleteSubcommand = defineCommand({
  meta: {
    name: 'delete',
    description: '删除 task（含 tasks/<name>/ 目录 + task.oxn + state.json + trace）',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    'task-name': { type: 'string', required: true, description: 'Task 名称' },
    force: { type: 'boolean', alias: 'f', description: '强制删除（不提示）' },
    'keep-state': { type: 'boolean', description: '保留 state.json 和 trace.jsonl（默认一并删）' },
    json: { type: 'boolean', description: 'JSON 格式输出' },
    yaml: { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args['task-name'] as string
    const force = ctx.args.force === true || ctx.args.f === true
    const keepState = ctx.args['keep-state'] === true

    const taskDir = getWorkTaskDir(workName, taskName)
    if (!existsSync(taskDir)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task directory not found: ${taskDir}` }, format)
    }

    if (!force) {
      // 简易确认：v0.1 简化为必须传 --force
      return outputError(
        {
          code: 'OXN_CONFIRM_REQUIRED',
          message: `deletion requires --force. pass --force to confirm deletion of ${taskDir}`,
        },
        format,
      )
    }

    if (keepState) {
      // 只删 task.oxn，保留 state/trace
      const taskOxn = join(taskDir, 'task.oxn')
      if (existsSync(taskOxn)) {
        const { unlinkSync } = require('fs') as typeof import('fs')
        unlinkSync(taskOxn)
      }
    } else {
      // 整个删 tasks/<name> 目录
      const { rmSync } = require('fs') as typeof import('fs')
      rmSync(taskDir, { recursive: true, force: true })
    }

    output(
      {
        ok: true,
        data: { workName, taskName, deleted: true, keptState: keepState },
        human: `Deleted task "${taskName}" in work "${workName}"${keepState ? ' (kept state)' : ''}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: submit
// ---------------------------------------------------------------------------
const submitSubcommand = defineCommand({
  meta: {
    name: 'submit',
    description: '薄壳：调用 oxn leader submit 推进 task 内的 part',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    'task-name': { type: 'string', required: true, description: 'Task 名称' },
    'run-probes': { type: 'boolean', description: '跑探针（v0.1 no-op）' },
    json: { type: 'boolean', description: 'JSON 格式输出' },
    yaml: { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    // 动态 import leader 的 submit 行为
    const { spawn } = await import('child_process')
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args['task-name'] as string
    const runProbes = ctx.args['run-probes'] === true

    const args = ['leader', 'submit', '--work-name', workName, '--task', taskName, '--json']
    if (runProbes) args.push('--run-probes')

    // 委托给 leader submit（v0.1 task 粒度）
    const { execSync } = await import('child_process')
    try {
      const cliPath = join(__dirname, 'index.ts')
      const out = execSync(`bun ${cliPath} ${args.join(' ')}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: { ...process.env, NO_COLOR: '1' },
      })
      output(JSON.parse(out.trim()), format)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return outputError({ code: 'OXN_TASK_SUBMIT_FAILED', message }, format)
    }
    void spawn
  },
})

export default defineCommand({
  meta: {
    name: 'task',
    description: 'v0.1 Task 生命周期管理 (new/status/list/edit/delete/submit) — work 下的 task',
  },
  subCommands: {
    new: newSubcommand,
    status: statusSubcommand,
    list: listSubcommand,
    edit: editSubcommand,
    delete: deleteSubcommand,
    submit: submitSubcommand,
  },
  run() {
    // No-op
  },
})
