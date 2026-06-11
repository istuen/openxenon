/**
 * Task 1.4 — OXN 内置资产注册表
 *
 * 替代 src/arsenals/builtin.ts 的硬编码方式，
 * 提供内存级的 @oxn/ 作用域资产查询表。
 *
 * Phase 1 先 Mock 内置数据，Phase 2 改由 .oxn 源文件加载。
 */
import type { BuiltinAssetEntry, IBuiltinRegistry, OxnAssetType } from './oxn-scope'

// ========================
// 内置探针定义
// ========================

const BUILTIN_PROBE_DEFS = {
  'shell-exec': {
    type: 'shell_exec',
    description: '执行 Shell 命令并验证退出码为 0',
    props: [
      { name: 'command', type: 'string', required: true },
      { name: 'cwd', type: 'string', required: false, default: '.' },
      { name: 'timeout', type: 'number', required: false, default: 30000 },
    ],
    output: { exit_code: 'number', stdout: 'string', stderr: 'string' },
  },
  'fs-exists': {
    type: 'fs_exists',
    description: '检查指定 glob 模式的文件是否存在',
    props: [{ name: 'pattern', type: 'string', required: true }],
    output: { exists: 'boolean', files: 'list<string>' },
  },
  'fs-not-exists': {
    type: 'fs_not_exists',
    description: '检查指定 glob 模式的文件是否不存在',
    props: [{ name: 'pattern', type: 'string', required: true }],
    output: { not_exists: 'boolean' },
  },
  'fs-content-match': {
    type: 'fs_content_match',
    description: '检查文件内容是否匹配指定模式',
    props: [
      { name: 'path', type: 'string', required: true },
      { name: 'contains', type: 'string', required: true },
    ],
    output: { matched: 'boolean' },
  },
} as const

// ========================
// 内置零件定义
// ========================

const BUILTIN_PART_DEFS = {
  'git-commit': {
    id: 'git-commit',
    name: 'Git Commit',
    description: '提交代码到 Git 仓库',
    implements: null,
    isAbstract: false,
    props: {
      type: 'object',
      properties: {
        feature_ref: { type: 'string' },
        message: { type: 'string', default: 'update' },
      },
      required: ['feature_ref'],
    },
    probes: [{ type: 'shell_exec', command: "git log -1 --pretty=%s | grep -q '${feature_ref}'" }],
    execution: ['probe.shell_exec'],
  },
  'create-branch': {
    id: 'create-branch',
    name: 'Create Branch',
    description: '创建新 feature 分支',
    implements: null,
    isAbstract: false,
    props: {
      type: 'object',
      properties: {
        branch_name: { type: 'string' },
      },
      required: ['branch_name'],
    },
    probes: [{ type: 'shell_exec', command: "git branch --show-current | grep -q '${branch_name}'" }],
    execution: ['probe.shell_exec'],
  },
  'develop-feature': {
    id: 'develop-feature',
    name: 'Develop Feature',
    description: '执行开发任务并通过测试验证',
    implements: null,
    isAbstract: false,
    props: {
      type: 'object',
      properties: {
        feature_desc: { type: 'string' },
        cwd: { type: 'string', default: '.' },
      },
      required: ['feature_desc'],
    },
    probes: [
      { type: 'shell_exec', command: 'pnpm build' },
      { type: 'shell_exec', command: 'pnpm test' },
    ],
    execution: ['probe.shell_exec', 'probe.shell_exec'],
  },
} as const

// ========================
// Registry 实现
// ========================

export class OxnBuiltinRegistry implements IBuiltinRegistry {
  private probes: Map<string, Record<string, unknown>>
  private parts: Map<string, Record<string, unknown>>
  private interfaces: Map<string, Record<string, unknown>>

  constructor() {
    this.probes = new Map()
    this.parts = new Map()
    this.interfaces = new Map()
    this._initProbes()
    this._initParts()
  }

  private _initProbes(): void {
    for (const [name, def] of Object.entries(BUILTIN_PROBE_DEFS)) {
      this.probes.set(name, { ...def, _builtin: true, _type: 'probe' })
    }
  }

  private _initParts(): void {
    for (const [name, def] of Object.entries(BUILTIN_PART_DEFS)) {
      this.parts.set(name, { ...def, _builtin: true, _type: 'part' })
    }
  }

  // ---- 查询接口 ----

  getProbe(name: string): Record<string, unknown> | null {
    return this.probes.get(name) ?? null
  }

  getPart(name: string): Record<string, unknown> | null {
    return this.parts.get(name) ?? null
  }

  getInterface(_name: string): Record<string, unknown> | null {
    return this.interfaces.get(_name) ?? null
  }

  has(name: string, type: OxnAssetType): boolean {
    switch (type) {
      case 'probe':
        return this.probes.has(name)
      case 'part':
        return this.parts.has(name)
      case 'interface':
        return this.interfaces.has(name)
      case 'blueprint':
        return false // builtin 暂无 blueprint
      default:
        return false
    }
  }

  listByType(type: OxnAssetType): BuiltinAssetEntry[] {
    switch (type) {
      case 'probe':
        return Array.from(this.probes.entries()).map(([name, data]) => ({
          name,
          type: 'probe',
          data,
        }))
      case 'part':
        return Array.from(this.parts.entries()).map(([name, data]) => ({
          name,
          type: 'part',
          data,
        }))
      case 'interface':
        return Array.from(this.interfaces.entries()).map(([name, data]) => ({
          name,
          type: 'interface',
          data,
        }))
      case 'blueprint':
        return []
      default:
        return []
    }
  }

  // ---- 扩展接口 ----

  /** 注册一个内置资产（供测试和动态注册使用） */
  register(name: string, type: OxnAssetType, data: Record<string, unknown>): void {
    const map = this._getMap(type)
    map.set(name, data)
  }

  /** 获取资产数量 */
  count(type: OxnAssetType): number {
    return this._getMap(type).size
  }

  /** 全部资产数量 */
  totalCount(): number {
    return this.probes.size + this.parts.size + this.interfaces.size
  }

  private _getMap(type: OxnAssetType): Map<string, Record<string, unknown>> {
    switch (type) {
      case 'probe':
        return this.probes
      case 'part':
        return this.parts
      case 'interface':
        return this.interfaces
      case 'blueprint':
        return new Map() // blueprint 暂时无内置
      default:
        return new Map()
    }
  }
}

// ========================
// 单例
// ========================

let _instance: OxnBuiltinRegistry | null = null

export function getBuiltinRegistry(): OxnBuiltinRegistry {
  if (!_instance) {
    _instance = new OxnBuiltinRegistry()
  }
  return _instance
}
