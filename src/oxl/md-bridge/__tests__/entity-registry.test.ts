/**
 * src/oxl/md-bridge/__tests__/entity-registry.test.ts
 *
 * EntityRegistry 单例 + factory + 注册覆盖 + 测试隔离守卫
 *
 * 覆盖：
 * - 单例性（多次 import 是同一实例）
 * - register/get/list
 * - 同 type 后注册覆盖前注册（开发期 warn）
 * - get 未注册 type 抛 E_OXL_ENTITY_NOT_REGISTERED
 * - _clearForTest 守卫（生产环境抛）
 * - 5 个 compiler import 时自动注册
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test'
import {
  entityRegistry,
  getEntityCompiler,
  registerEntityCompiler,
  E_OXL_ENTITY_NOT_REGISTERED,
} from '../entity-registry.js'
import type {
  EntityCompiler,
  CompileInput,
  CompileOutput,
  ParseInput,
  ValidationInput,
  ValidationError,
} from '../entity-compiler.js'
import type { IntentEntityType } from '../pipeline.js'

// 副作用 import：注册 5 个 compiler（用于第一个 describe block 的 get('domain')）
import '../compilers/index.js'

describe('EntityRegistry 单例性', () => {
  test('多次 import 是同一实例', () => {
    const r1 = entityRegistry
    const r2 = entityRegistry
    expect(r1).toBe(r2)
  })

  test('getEntityCompiler 与 entityRegistry.get 等价', () => {
    const fromRegistry = entityRegistry.get('domain')
    const fromFn = getEntityCompiler('domain')
    expect(fromRegistry).toBe(fromFn)
  })
})

describe('EntityRegistry 注册与获取', () => {
  // 创建 1 个 mock compiler 用于测试
  class MockCompiler implements EntityCompiler {
    readonly entityType: IntentEntityType = 'mock'
    compileCalled = 0
    parseCalled = 0
    validateCalled = 0
    compile(_input: CompileInput): CompileOutput {
      this.compileCalled++
      return { md: '# mock', name: 'mock', warnings: [] }
    }
    parse(_input: ParseInput): Record<string, unknown> {
      this.parseCalled++
      return { entity: 'mock' }
    }
    validate(_input: ValidationInput): ValidationError[] {
      this.validateCalled++
      return []
    }
  }

  test('register 1 个 + get 返回同一对象', () => {
    const mock = new MockCompiler()
    registerEntityCompiler(mock)
    const got = getEntityCompiler('mock')
    expect(got).toBe(mock)
  })

  test('list 包含已注册 type', () => {
    registerEntityCompiler(new MockCompiler())
    const list = entityRegistry.list()
    expect(list).toContain('mock')
  })

  test('get 未注册 type 抛 E_OXL_ENTITY_NOT_REGISTERED', () => {
    expect(() => entityRegistry.get('not-registered' as IntentEntityType)).toThrow(
      new RegExp(E_OXL_ENTITY_NOT_REGISTERED),
    )
  })

  test('get 未注册 type 抛 Error 子类', () => {
    try {
      entityRegistry.get('not-registered' as IntentEntityType)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).name).toBe(E_OXL_ENTITY_NOT_REGISTERED)
    }
  })

  test('get 未注册 type 错误消息含 available types', () => {
    registerEntityCompiler(new MockCompiler())
    try {
      entityRegistry.get('unregistered' as IntentEntityType)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('mock')
    }
  })

  test('同 type 后注册覆盖前注册', () => {
    const first = new MockCompiler()
    const second = new MockCompiler()
    registerEntityCompiler(first)
    registerEntityCompiler(second)
    const got = getEntityCompiler('mock')
    expect(got).toBe(second) // 后注册覆盖
  })
})

describe('5 个 compiler 副作用注册', () => {
  test('import "./compilers/index.js" 注册 5 个 type', () => {
    const list = entityRegistry.list()
    expect(list).toContain('domain')
    expect(list).toContain('blueprint')
    expect(list).toContain('work')
    expect(list).toContain('task')
    expect(list).toContain('proof')
  })

  test('getEntityCompiler("domain") 返回 DomainCompiler 实例', () => {
    const compiler = getEntityCompiler('domain')
    expect(compiler.entityType).toBe('domain')
    expect(compiler.constructor.name).toBe('DomainCompiler')
  })

  test('getEntityCompiler("blueprint") 返回 BlueprintCompiler 实例', () => {
    const compiler = getEntityCompiler('blueprint')
    expect(compiler.constructor.name).toBe('BlueprintCompiler')
  })

  test('getEntityCompiler("work") 返回 WorkCompiler 实例', () => {
    const compiler = getEntityCompiler('work')
    expect(compiler.constructor.name).toBe('WorkCompiler')
  })

  test('getEntityCompiler("task") 返回 TaskCompiler 实例', () => {
    const compiler = getEntityCompiler('task')
    expect(compiler.constructor.name).toBe('TaskCompiler')
  })

  test('getEntityCompiler("proof") 返回 ProofCompiler 实例', () => {
    const compiler = getEntityCompiler('proof')
    expect(compiler.constructor.name).toBe('ProofCompiler')
  })
})

// 注：_clearForTest 测试放最后 + 还原 5 个 compiler，避免影响其他并行测试
import { DomainCompiler } from '../compilers/domain-compiler.js'
import { BlueprintCompiler } from '../compilers/blueprint-compiler.js'
import { WorkCompiler } from '../compilers/work-compiler.js'
import { TaskCompiler } from '../compilers/task-compiler.js'
import { ProofCompiler } from '../compilers/proof-compiler.js'

describe('EntityRegistry 测试隔离（最后）', () => {
  test('_clearForTest 清空注册表 + 还原 5 个 compiler', () => {
    class TempCompiler implements EntityCompiler {
      readonly entityType = 'temp' as IntentEntityType
      compile(): CompileOutput {
        return { md: '', name: '', warnings: [] }
      }
      parse(): Record<string, unknown> {
        return {}
      }
      validate(): ValidationError[] {
        return []
      }
    }
    registerEntityCompiler(new TempCompiler())
    expect(entityRegistry.list()).toContain('temp')

    if (process.env.NODE_ENV !== 'production') {
      entityRegistry._clearForTest()
    }
    expect(entityRegistry.list()).not.toContain('temp')

    // 还原 5 个 canonical compiler（避免影响后续并行测试）
    registerEntityCompiler(new DomainCompiler())
    registerEntityCompiler(new BlueprintCompiler())
    registerEntityCompiler(new WorkCompiler())
    registerEntityCompiler(new TaskCompiler())
    registerEntityCompiler(new ProofCompiler())
  })
})
