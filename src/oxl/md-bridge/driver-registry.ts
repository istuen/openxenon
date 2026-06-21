/**
 * Driver Registry — OXL driver 运行时注册表
 *
 * 阶段：v0.3.0 Step 1.2
 * 角色：管理 langium + mdast driver 的注册、选择、切换
 *
 * 关键 API：
 * - register(driver): 注册 driver
 * - get(name): 获取 driver
 * - setDefault(name): 设置默认 driver
 * - getDefault(): 获取当前默认
 *
 * 切换方式：
 * - 编程式：driverRegistry.setDefault('mdast')
 * - 环境变量：OXL_DRIVER=mdast
 * - 配置：.openxenon/config.json 中的 oxl.driver 字段
 */

import { LangiumOxlDriver } from '../langium-driver/langium-oxl-driver.js'
import { MdastOxlDriver } from './mdast-oxl-driver.js'
import type { OxlDriver, OxlDriverName } from '../contracts/oxl-driver.js'

/**
 * Driver Registry（单例）
 */
class DriverRegistryImpl {
  private drivers = new Map<OxlDriverName, OxlDriver>()
  private defaultDriver: OxlDriverName = 'langium'

  constructor() {
    // 默认注册两个 driver
    this.register(new LangiumOxlDriver())
    this.register(new MdastOxlDriver())
  }

  /**
   * 注册 driver（同名 driver 覆盖）
   */
  register(driver: OxlDriver): void {
    this.drivers.set(driver.name, driver)
  }

  /**
   * 获取指定 driver
   */
  get(name: OxlDriverName): OxlDriver {
    const driver = this.drivers.get(name)
    if (!driver) {
      throw new Error(`OxlDriver '${name}' not registered. Available: ${Array.from(this.drivers.keys()).join(', ')}`)
    }
    return driver
  }

  /**
   * 设置默认 driver
   */
  setDefault(name: OxlDriverName): void {
    if (!this.drivers.has(name)) {
      throw new Error(`OxlDriver '${name}' not registered`)
    }
    this.defaultDriver = name
  }

  /**
   * 获取当前默认 driver
   */
  getDefault(): OxlDriver {
    return this.get(this.defaultDriver)
  }

  /**
   * 获取当前默认 driver 名称
   */
  getDefaultName(): OxlDriverName {
    return this.defaultDriver
  }

  /**
   * 列出所有已注册 driver
   */
  list(): OxlDriverName[] {
    return Array.from(this.drivers.keys())
  }

  /**
   * 从环境变量或配置加载默认 driver
   */
  loadFromEnv(): void {
    const envDriver = process.env.OXL_DRIVER as OxlDriverName | undefined
    if (envDriver && this.drivers.has(envDriver)) {
      this.setDefault(envDriver)
    }
  }
}

/**
 * 全局单例
 */
export const driverRegistry = new DriverRegistryImpl()

/**
 * 便捷函数
 */
export function getActiveDriver(): OxlDriver {
  return driverRegistry.getDefault()
}

export function setActiveDriver(name: OxlDriverName): void {
  driverRegistry.setDefault(name)
}
