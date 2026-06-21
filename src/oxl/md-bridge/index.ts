/**
 * md-bridge 内部 barrel（v0.3 阶段 2）
 *
 * 阶段：v0.3.0 Step 1.2
 * 角色：md-bridge 子目录统一出口
 *
 * 关键导出：
 * - MdastOxlDriver：mdast 驱动的 OXL 入口
 * - driverRegistry：driver 注册表
 * - getActiveDriver / setActiveDriver：driver 选择 API
 */

export { MdastOxlDriver } from './mdast-oxl-driver.js'
export type { MdastRoot, MdastNode } from './mdast-oxl-driver.js'

export {
  driverRegistry,
  getActiveDriver,
  setActiveDriver,
} from './driver-registry.js'
