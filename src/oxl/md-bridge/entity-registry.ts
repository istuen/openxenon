/**
 * md-bridge/entity-registry.ts — EntityRegistry 单例 + 工厂
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 维护 5 类 EntityCompiler 的注册表
 * - 提供 factory get(type) 接口
 * - 与 driverRegistry 范式严格对齐（class impl + module-level 单例 + 便捷函数）
 *
 * 关键不变量：
 * - register 同 type 后注册覆盖前注册（开发期 warn，生产期 silent 覆盖）
 * - get 未注册 type 抛 Error（对齐 driver-registry.ts:49 原生 Error 范式）
 * - _clearForTest 仅 NODE_ENV !== 'production' 暴露
 * - 模块副作用：import './compilers/index.js' 触发 5 个 compiler 注册
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 * - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type { EntityCompiler } from './entity-compiler.js'
import type { IntentEntityType } from './pipeline.js'

/** 错误码常量：未注册 entity type（v0.3 改革新增）*/
export const E_OXL_ENTITY_NOT_REGISTERED = 'E_OXL_ENTITY_NOT_REGISTERED' as const

// ========================
// Registry 实现
// ========================

class EntityRegistryImpl {
  private compilers = new Map<IntentEntityType, EntityCompiler>()

  /**
   * 注册 compiler。
   * - 同 type 后注册覆盖前注册
   * - 开发期 warn；生产期 silent 覆盖
   */
  register(compiler: EntityCompiler): void {
    if (this.compilers.has(compiler.entityType)) {
      if (process.env.NODE_ENV !== 'production') {
        const previous = this.compilers.get(compiler.entityType)!.constructor.name
        console.warn(
          `[EntityRegistry] overwriting compiler for '${compiler.entityType}' ` +
            `(previous: ${previous}, new: ${compiler.constructor.name})`,
        )
      }
    }
    this.compilers.set(compiler.entityType, compiler)
  }

  /**
   * Factory 核心：按 type 取出 compiler。
   * 未注册 → 抛 Error（对齐 driver-registry.ts:49 范式）
   *
   * Error.name = 'E_OXL_ENTITY_NOT_REGISTERED'（机器可读）
   * Error.message = "[E_OXL_ENTITY_NOT_REGISTERED] No EntityCompiler registered for type 'X'. Available: ..."
   */
  get(type: IntentEntityType): EntityCompiler {
    const compiler = this.compilers.get(type)
    if (!compiler) {
      const err = new Error(
        `[${E_OXL_ENTITY_NOT_REGISTERED}] No EntityCompiler registered for type '${type}'. ` +
          `Available: ${this.list().join(', ') || '(none)'}`,
      )
      err.name = E_OXL_ENTITY_NOT_REGISTERED
      throw err
    }
    return compiler
  }

  /**
   * 列出已注册的所有 type
   */
  list(): IntentEntityType[] {
    return Array.from(this.compilers.keys())
  }

  /**
   * 测试隔离：清空注册表。
   * 仅 NODE_ENV !== 'production' 暴露（生产环境抛 Error）
   */
  _clearForTest(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EntityRegistry._clearForTest is forbidden in production')
    }
    this.compilers.clear()
  }
}

// ========================
// 全局单例
// ========================

/** 全局单例（严格对齐 driverRegistry 范式）*/
export const entityRegistry = new EntityRegistryImpl()

// ========================
// 便捷函数
// ========================

/** 便捷函数：按 type 取出 compiler */
export function getEntityCompiler(type: IntentEntityType): EntityCompiler {
  return entityRegistry.get(type)
}

/** 便捷函数：注册 compiler */
export function registerEntityCompiler(compiler: EntityCompiler): void {
  entityRegistry.register(compiler)
}
