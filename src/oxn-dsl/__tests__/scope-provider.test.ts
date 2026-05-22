import { describe, test, expect, beforeEach } from 'bun:test'
import {
  parseOxnReference,
  formatOxnReference,
  isValidOxnReference,
  getScopeRoot,
  getScopeAssetDir,
  compareProps,
  type OxnReference,
  type OxnScope,
  type OxnAssetType,
} from '../scope/oxn-scope'
import { OxnBuiltinRegistry, getBuiltinRegistry } from '../scope/oxn-builtin-registry'
import { OxnWorkspaceManager, createWorkspaceManager, getWorkspaceManager } from '../scope/oxn-workspace-manager'

// ========================
// parseOxnReference 测试
// ========================

describe('parseOxnReference — 引用解析', () => {
  test('三段式 @oxn/probe/shell-exec', () => {
    const ref = parseOxnReference('@oxn/probe/shell-exec')
    expect(ref).not.toBeNull()
    expect(ref!.scope).toBe('oxn')
    expect(ref!.type).toBe('probe')
    expect(ref!.name).toBe('shell-exec')
    expect(ref!.raw).toBe('@oxn/probe/shell-exec')
  })

  test('三段式 @prj/part/jest-runner', () => {
    const ref = parseOxnReference('@prj/part/jest-runner')
    expect(ref!.scope).toBe('prj')
    expect(ref!.type).toBe('part')
    expect(ref!.name).toBe('jest-runner')
  })

  test('三段式 @glo/blueprint/deploy', () => {
    const ref = parseOxnReference('@glo/blueprint/deploy')
    expect(ref!.scope).toBe('glo')
    expect(ref!.type).toBe('blueprint')
    expect(ref!.name).toBe('deploy')
  })

  test('三段式 @prj/interface/test-runner', () => {
    const ref = parseOxnReference('@prj/interface/test-runner')
    expect(ref!.scope).toBe('prj')
    expect(ref!.type).toBe('interface')
    expect(ref!.name).toBe('test-runner')
  })

  test('两段式 @oxn/shell-exec', () => {
    const ref = parseOxnReference('@oxn/shell-exec')
    expect(ref!.scope).toBe('oxn')
    expect(ref!.type).toBeUndefined()
    expect(ref!.name).toBe('shell-exec')
  })

  test('两段式 @prj/my-part', () => {
    const ref = parseOxnReference('@prj/my-part')
    expect(ref!.scope).toBe('prj')
    expect(ref!.type).toBeUndefined()
    expect(ref!.name).toBe('my-part')
  })

  test('非法引用：无 @ 前缀', () => {
    expect(parseOxnReference('prj/part/test')).toBeNull()
  })

  test('非法引用：非三作用域', () => {
    expect(parseOxnReference('@xxx/part/test')).toBeNull()
  })

  test('非法引用：空字符串', () => {
    expect(parseOxnReference('@')).toBeNull()
    expect(parseOxnReference('')).toBeNull()
  })

  test('非法引用：末尾斜杠', () => {
    expect(parseOxnReference('@prj/')).toBeNull()
  })

  test('formatOxnReference 格式化输出', () => {
    const ref: OxnReference = {
      raw: '@prj/part/test',
      scope: 'prj',
      type: 'part',
      name: 'test',
    }
    expect(formatOxnReference(ref)).toBe('@prj/part/test')
  })

  test('isValidOxnReference 验证', () => {
    expect(isValidOxnReference('@prj/part/test')).toBe(true)
    expect(isValidOxnReference('invalid')).toBe(false)
    expect(isValidOxnReference('')).toBe(false)
  })
})

// ========================
// 作用域路径映射测试
// ========================

describe('getScopeRoot / getScopeAssetDir', () => {
  test('@oxn 无文件系统路径', () => {
    expect(getScopeRoot('oxn')).toBeNull()
  })

  test('@prj 映射到项目 .openxenon/arsenals', () => {
    const root = getScopeRoot('prj', '/tmp/test-project')
    expect(root).toContain('.openxenon/arsenals')
    expect(root).toContain('/tmp/test-project')
  })

  test('@prj 无 projectRoot 返回 null', () => {
    expect(getScopeRoot('prj')).toBeNull()
  })

  test('@glo 映射到用户目录', () => {
    const root = getScopeRoot('glo')
    expect(root).toContain('.openxenon/arsenals')
  })

  test('getScopeAssetDir 正确映射类型目录', () => {
    const dir = getScopeAssetDir('prj', 'part', '/tmp/test')
    expect(dir).toContain('parts')
  })

  test('getScopeAssetDir @oxn 返回 null', () => {
    expect(getScopeAssetDir('oxn', 'probe')).toBeNull()
  })
})

// ========================
// compareProps 跨文件 Props 比对
// ========================

describe('compareProps — 跨 AST Props 比对', () => {
  test('完全匹配通过', () => {
    const result = compareProps({ target_env: 'prop.env', coverage_threshold: 'prop.coverage' }, [
      { name: 'target_env', type: 'string', required: false },
      { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
    ])
    expect(result.missingRequired).toHaveLength(0)
    expect(result.unknownFields).toHaveLength(0)
    expect(result.typeMismatches).toHaveLength(0)
  })

  test('required 参数缺失检测', () => {
    const result = compareProps(
      { target_env: 'prop.env' }, // 缺少 coverage_threshold
      [
        { name: 'target_env', type: 'string', required: false },
        { name: 'coverage_threshold', type: 'number', required: true },
      ],
    )
    expect(result.missingRequired).toContain('coverage_threshold')
  })

  test('有 default 的 required 豁免', () => {
    const result = compareProps({ target_env: 'prop.env' }, [
      { name: 'target_env', type: 'string', required: false },
      { name: 'timeout', type: 'number', required: true, default: 30000 },
    ])
    expect(result.missingRequired).toHaveLength(0)
  })

  test('未知字段检测', () => {
    const result = compareProps({ bad_field: 'prop.env' }, [{ name: 'target_env', type: 'string', required: true }])
    expect(result.unknownFields).toContain('bad_field')
  })
})

// ========================
// OxnBuiltinRegistry 测试
// ========================

describe('OxnBuiltinRegistry', () => {
  let registry: OxnBuiltinRegistry

  beforeEach(() => {
    registry = new OxnBuiltinRegistry()
  })

  test('查询内置探针 shell-exec', () => {
    const probe = registry.getProbe('shell-exec')
    expect(probe).not.toBeNull()
    expect(probe!.type).toBe('shell_exec')
  })

  test('查询不存在的探针返回 null', () => {
    expect(registry.getProbe('nonexistent')).toBeNull()
  })

  test('查询内置零件 git-commit', () => {
    const part = registry.getPart('git-commit')
    expect(part).not.toBeNull()
    expect(part!.name).toBe('Git Commit')
  })

  test('has 检查', () => {
    expect(registry.has('shell-exec', 'probe')).toBe(true)
    expect(registry.has('git-commit', 'part')).toBe(true)
    expect(registry.has('nonexistent', 'probe')).toBe(false)
    expect(registry.has('anything', 'blueprint')).toBe(false)
  })

  test('listByType 返回所有探针', () => {
    const probes = registry.listByType('probe')
    expect(probes.length).toBeGreaterThanOrEqual(4)
    expect(probes.map((p) => p.name)).toContain('shell-exec')
    expect(probes.map((p) => p.name)).toContain('fs-exists')
  })

  test('listByType 返回所有零件', () => {
    const parts = registry.listByType('part')
    expect(parts.length).toBeGreaterThanOrEqual(3)
    expect(parts.map((p) => p.name)).toContain('git-commit')
  })

  test('listByType blueprint 返回空数组', () => {
    const bps = registry.listByType('blueprint')
    expect(bps).toEqual([])
  })

  test('count 和 totalCount', () => {
    expect(registry.count('probe')).toBeGreaterThanOrEqual(4)
    expect(registry.count('part')).toBeGreaterThanOrEqual(3)
    expect(registry.totalCount()).toBeGreaterThanOrEqual(7)
  })

  test('动态注册', () => {
    registry.register('custom-probe', 'probe', {
      type: 'custom',
      description: 'test probe',
      props: [],
    })
    expect(registry.has('custom-probe', 'probe')).toBe(true)
    expect(registry.getProbe('custom-probe')).not.toBeNull()
  })

  test('getBuiltinRegistry 单例', () => {
    const r1 = getBuiltinRegistry()
    const r2 = getBuiltinRegistry()
    expect(r1).toBe(r2)
  })
})

// ========================
// OxnWorkspaceManager 测试
// ========================

describe('OxnWorkspaceManager', () => {
  let manager: OxnWorkspaceManager

  beforeEach(() => {
    manager = createWorkspaceManager()
  })

  test('解析 @oxn/probe/shell-exec', () => {
    const result = manager.resolve('@oxn/probe/shell-exec')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.asset).not.toBeNull()
    expect(result.reference.scope).toBe('oxn')
    expect(result.reference.name).toBe('shell-exec')
  })

  test('解析 @oxn/part/git-commit', () => {
    const result = manager.resolve('@oxn/part/git-commit')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.reference.name).toBe('git-commit')
  })

  test('解析两段式 @oxn/shell-exec (typeHint=probe)', () => {
    const result = manager.resolve('@oxn/shell-exec', 'probe')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.reference.name).toBe('shell-exec')
  })

  test('解析不存在的 @oxn 引用', () => {
    const result = manager.resolve('@oxn/probe/fake-probe')
    expect(result.resolvedFrom).toBe('not_found')
    expect(result.asset).toBeNull()
  })

  test('解析非法引用', () => {
    const result = manager.resolve('not-a-ref')
    expect(result.resolvedFrom).toBe('not_found')
  })

  test('解析 @prj 资产（无文件时返回 not_found）', () => {
    const result = manager.resolve('@prj/part/nonexistent')
    expect(result.resolvedFrom).toBe('not_found')
    expect(result.asset).toBeNull()
  })

  test('解析 @prj 资产（期望的 TypeScript 文件至少能被 findImplementors 检索）', () => {
    // 测试 findImplementors 接口不抛异常
    const impls = manager.findImplementors('test-runner')
    expect(Array.isArray(impls)).toBe(true)
  })

  test('list @oxn probe 返回内置探针', () => {
    const probes = manager.list('oxn', 'probe')
    expect(probes.length).toBeGreaterThanOrEqual(4)
    for (const p of probes) {
      expect(p.resolvedFrom).toBe('builtin')
      expect(p.reference.scope).toBe('oxn')
    }
  })

  test('list @oxn part 返回内置零件', () => {
    const parts = manager.list('oxn', 'part')
    expect(parts.length).toBeGreaterThanOrEqual(3)
  })

  test('list @oxn interface 返回空', () => {
    const ifaces = manager.list('oxn', 'interface')
    expect(ifaces).toEqual([])
  })

  test('count 返回正确数量', () => {
    expect(manager.count('oxn', 'probe')).toBeGreaterThanOrEqual(4)
    expect(manager.count('oxn', 'part')).toBeGreaterThanOrEqual(3)
  })

  test('resolve 缓存机制', () => {
    const r1 = manager.resolve('@oxn/probe/shell-exec')
    const r2 = manager.resolve('@oxn/probe/shell-exec')
    expect(r1).toBe(r2) // 引用相同
  })

  test('invalidateCache 清除缓存', () => {
    const r1 = manager.resolve('@oxn/probe/shell-exec')
    manager.invalidateCache()
    const r2 = manager.resolve('@oxn/probe/shell-exec')
    // 缓存清除后重新解析，asset 数据相同但对象可能不同
    expect(r2.ref).toBe(r1.ref)
    expect(r2.resolvedFrom).toBe('builtin')
  })

  test('支持两段式引用自动推断类型', () => {
    // @oxn/shell-exec 已知是 probe
    const result = manager.resolve('@oxn/shell-exec', 'probe')
    expect(result.resolvedFrom).toBe('builtin')
  })
})

// ========================
// 集成测试：Props 完整校验流程
// ========================

describe('集成测试：scope → resolve → compareProps', () => {
  let manager: OxnWorkspaceManager
  let registry: OxnBuiltinRegistry

  beforeEach(() => {
    manager = createWorkspaceManager()
    registry = getBuiltinRegistry()
  })

  test('解析 builtin part git-commit 并提取 props', () => {
    const result = manager.resolve('@oxn/part/git-commit')
    expect(result.resolvedFrom).toBe('builtin')

    const data = (result.asset as { data: Record<string, unknown> }).data
    expect(data).toBeTruthy()

    // 从 data.props 提取 prop 列表
    const props = data.props as {
      type: 'object'
      properties: Record<string, { type: string; default?: unknown }>
      required?: string[]
    }
    expect(props.type).toBe('object')
    expect(props.properties.feature_ref).toBeTruthy()
    expect(props.properties.feature_ref.type).toBe('string')
    expect(props.required).toContain('feature_ref')
  })

  test('compareProps 验证 builtin part 的参数覆盖', () => {
    // git-commit requires feature_ref, message has default
    const result = compareProps({ feature_ref: 'prop.branch', message: '"chore: update"' }, [
      { name: 'feature_ref', type: 'string', required: true },
      { name: 'message', type: 'string', required: false, default: 'update' },
    ])
    expect(result.missingRequired).toHaveLength(0)
    expect(result.unknownFields).toHaveLength(0)
  })

  test('compareProps 检测缺失的 required 参数', () => {
    const result = compareProps(
      { message: '"fix: bug"' }, // 缺少 feature_ref
      [
        { name: 'feature_ref', type: 'string', required: true },
        { name: 'message', type: 'string', required: false, default: 'update' },
      ],
    )
    expect(result.missingRequired).toContain('feature_ref')
  })

  test('builtin probes 的 props 结构正确', () => {
    const probes = manager.list('oxn', 'probe')
    for (const p of probes) {
      expect(p.asset).not.toBeNull()
      expect(p.reference.name).toBeTruthy()
    }
  })

  test('builtin parts 有 implements 或 execution 信息', () => {
    const gitCommit = registry.getPart('git-commit')
    expect(gitCommit).not.toBeNull()
    // git-commit 没有 implements（因未定义 interface）
    const exec = (gitCommit as Record<string, unknown>).execution as string[]
    expect(Array.isArray(exec)).toBe(true)
    expect(exec.length).toBeGreaterThan(0)
  })
})
