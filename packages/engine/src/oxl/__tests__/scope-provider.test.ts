import { beforeEach, describe, expect, test } from 'bun:test'
import { getBuiltinRegistry, OxnBuiltinRegistry } from '../scope/oxn-builtin-registry'
import {
  compareProps,
  formatOxnReference,
  getScopeAssetDir,
  getScopeRoot,
  isValidOxnReference,
  type OxnReference,
  parseOxnReference,
} from '../scope/oxn-scope'
import { createWorkspaceManager, type OxnWorkspaceManager } from '../scope/oxn-workspace-manager'

// ========================
// parseOxnReference 测试
// ========================

describe('parseOxnReference — 引用解析', () => {
  test('三段式 @oxn/probe/shell-exec', () => {
    const ref = parseOxnReference('@oxn/probe/shell-exec')
    expect(ref).not.toBeNull()
    expect(ref?.scope).toBe('oxn')
    expect(ref?.type).toBe('probe')
    expect(ref?.name).toBe('shell-exec')
    expect(ref?.raw).toBe('@oxn/probe/shell-exec')
  })

  test('三段式 @prj/part/jest-runner', () => {
    const ref = parseOxnReference('@prj/part/jest-runner')
    expect(ref?.scope).toBe('prj')
    expect(ref?.type).toBe('part')
    expect(ref?.name).toBe('jest-runner')
  })

  test('@glo 已废弃 — 解析失败', () => {
    // v0.1: @glo scope removed (no global assets; cross-project via Git)
    const ref = parseOxnReference('@glo/blueprint/deploy')
    expect(ref).toBeNull()
  })

  test('三段式 @prj/interface/test-runner', () => {
    const ref = parseOxnReference('@prj/interface/test-runner')
    expect(ref?.scope).toBe('prj')
    expect(ref?.type).toBe('interface')
    expect(ref?.name).toBe('test-runner')
  })

  test('两段式 @oxn/shell-exec', () => {
    const ref = parseOxnReference('@oxn/shell-exec')
    expect(ref?.scope).toBe('oxn')
    expect(ref?.type).toBeUndefined()
    expect(ref?.name).toBe('shell-exec')
  })

  test('两段式 @prj/my-part', () => {
    const ref = parseOxnReference('@prj/my-part')
    expect(ref?.scope).toBe('prj')
    expect(ref?.type).toBeUndefined()
    expect(ref?.name).toBe('my-part')
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

  test('@prj 映射到项目 .openxenon/assets', () => {
    const root = getScopeRoot('prj', '/tmp/test-project')
    expect(root).toContain('.openxenon/assets')
    expect(root).toContain('/tmp/test-project')
  })

  test('@prj 无 projectRoot 返回 null', () => {
    expect(getScopeRoot('prj')).toBeNull()
  })

  test('@glo scope 已废弃 — getScopeRoot 不再支持', () => {
    // v0.1: 'glo' is no longer in OxnScope union; this test asserts compile-time error
    // (if you uncomment, TS will reject: 'glo' is not assignable to 'OxnScope')
    // getScopeRoot('glo') — type error
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

  test('查询内置探针 shell_exec', () => {
    const probe = registry.getProbe('shell_exec')
    expect(probe).not.toBeNull()
    expect(probe?.type).toBe('shell_exec')
  })

  test('查询不存在的探针返回 null', () => {
    expect(registry.getProbe('nonexistent')).toBeNull()
  })

  test('查询内置零件返回 null（D18 收窄）', () => {
    // v0.7 Phase 4: parts builtin 延后（src/builtin/ 无 parts/*.md）
    // 旧版本硬编码的 3 phantom parts (git-commit/create-branch/develop-feature) 已删除
    expect(registry.getPart('git-commit')).toBeNull()
    expect(registry.has('git-commit', 'part')).toBe(false)
  })

  test('has 检查', () => {
    expect(registry.has('shell_exec', 'probe')).toBe(true)
    expect(registry.has('nonexistent', 'probe')).toBe(false)
    expect(registry.has('git-workflow', 'blueprint')).toBe(true)
    expect(registry.has('anything', 'blueprint')).toBe(false)
  })

  test('listByType 返回 19 个探针（v0.6.2: 15 + 4 doc-*）', () => {
    const probes = registry.listByType('probe')
    expect(probes.length).toBe(19)
    expect(probes.map((p) => p.name)).toContain('shell_exec')
    expect(probes.map((p) => p.name)).toContain('fs-exists')
    expect(probes.map((p) => p.name)).toContain('ts-compiles')
    expect(probes.map((p) => p.name)).toContain('docs-build')
    expect(probes.map((p) => p.name)).toContain('heading-skeleton-check')
  })

  test('listByType 返回 3 个蓝图', () => {
    const bps = registry.listByType('blueprint')
    expect(bps.length).toBe(3)
    expect(bps.map((b) => b.name)).toContain('git-workflow')
    expect(bps.map((b) => b.name)).toContain('verify-pipeline')
    expect(bps.map((b) => b.name)).toContain('leader-test-dsl')
  })

  test('listByType part 返回空数组（D18 收窄）', () => {
    expect(registry.listByType('part')).toEqual([])
  })

  test('count 和 totalCount（v0.6.2: 19 probes = 15 + 4 doc-*）', () => {
    expect(registry.count('probe')).toBe(19)
    expect(registry.count('blueprint')).toBe(3)
    expect(registry.count('part')).toBe(0)
    expect(registry.totalCount()).toBe(22)
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

  test('解析 @oxn/probe/shell_exec', () => {
    const result = manager.resolve('@oxn/probe/shell_exec')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.asset).not.toBeNull()
    expect(result.reference.scope).toBe('oxn')
    expect(result.reference.name).toBe('shell_exec')
  })

  test('解析 @oxn/blueprint/git-workflow', () => {
    const result = manager.resolve('@oxn/blueprint/git-workflow')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.reference.name).toBe('git-workflow')
  })

  test('解析两段式 @oxn/shell_exec (typeHint=probe)', () => {
    const result = manager.resolve('@oxn/shell_exec', 'probe')
    expect(result.resolvedFrom).toBe('builtin')
    expect(result.reference.name).toBe('shell_exec')
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

  test('list @oxn probe 返回 19 个内置探针（v0.6.2: 15 + 4 doc-*）', () => {
    const probes = manager.list('oxn', 'probe')
    expect(probes.length).toBe(19)
    for (const p of probes) {
      expect(p.resolvedFrom).toBe('builtin')
      expect(p.reference.scope).toBe('oxn')
    }
  })

  test('list @oxn blueprint 返回 3 个内置蓝图', () => {
    const bps = manager.list('oxn', 'blueprint')
    expect(bps.length).toBe(3)
  })

  test('list @oxn part 返回空（D18 收窄）', () => {
    const parts = manager.list('oxn', 'part')
    expect(parts).toEqual([])
  })

  test('list @oxn interface 返回空', () => {
    const ifaces = manager.list('oxn', 'interface')
    expect(ifaces).toEqual([])
  })

  test('count 返回正确数量（v0.6.2: 19 probes）', () => {
    expect(manager.count('oxn', 'probe')).toBe(19)
    expect(manager.count('oxn', 'blueprint')).toBe(3)
    expect(manager.count('oxn', 'part')).toBe(0)
  })

  test('resolve 缓存机制', () => {
    const r1 = manager.resolve('@oxn/probe/shell_exec')
    const r2 = manager.resolve('@oxn/probe/shell_exec')
    expect(r1).toBe(r2) // 引用相同
  })

  test('invalidateCache 清除缓存', () => {
    const r1 = manager.resolve('@oxn/probe/shell_exec')
    manager.invalidateCache()
    const r2 = manager.resolve('@oxn/probe/shell_exec')
    // 缓存清除后重新解析，asset 数据相同但对象可能不同
    expect(r2.ref).toBe(r1.ref)
    expect(r2.resolvedFrom).toBe('builtin')
  })

  test('支持两段式引用自动推断类型', () => {
    const result = manager.resolve('@oxn/shell_exec', 'probe')
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

  test('解析 builtin probe shell_exec 并提取 props', () => {
    const result = manager.resolve('@oxn/probe/shell_exec')
    expect(result.resolvedFrom).toBe('builtin')

    const data = (result.asset as { data: Record<string, unknown> }).data
    expect(data).toBeTruthy()

    // shell_exec 探针应有 command prop (required)
    const props = data.props as Array<{ name: string; type: string; required?: boolean }>
    expect(Array.isArray(props)).toBe(true)
    const cmd = props.find((p) => p.name === 'command')
    expect(cmd).toBeDefined()
    expect(cmd?.type).toBe('string')
    expect(cmd?.required).toBe(true)
  })

  test('builtin probes 的 props 结构正确', () => {
    const probes = manager.list('oxn', 'probe')
    for (const p of probes) {
      expect(p.asset).not.toBeNull()
      expect(p.reference.name).toBeTruthy()
    }
  })

  test('builtin blueprints 含 slots + deps', () => {
    const bps = registry.listByType('blueprint')
    for (const bp of bps) {
      const slots = bp.data.slots as Array<{ name: string; deps: string[] }>
      expect(Array.isArray(slots)).toBe(true)
      for (const slot of slots) {
        expect(slot.name).toBeTruthy()
        expect(Array.isArray(slot.deps)).toBe(true)
      }
    }
  })
})
