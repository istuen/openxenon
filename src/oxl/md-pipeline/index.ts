/**
 * md-pipeline/index.ts — v0.4 PR-C1 unified-native 入口
 *
 * 角色：unified pipeline 编排 (把 md 字符串 → mdast → 处理 → 序列化)
 *   取代 src/oxl/md-bridge/pipeline.ts (hybrid unified + 自研)
 *   新文件 src/oxl/md-pipeline/index.ts (纯 unified-native)
 *
 * 关键不变量：
 *   - 不感知 fs (只接收 content 字符串)
 *   - 不感知 OpenXenon Kernel (只输出 mdast)
 *   - 失败抛 E_MD_INVALID_SYNTAX 错误 (与 v0.3.4 兼容)
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 *
 * 迁移路径 (RFC §4 PR-C 序列)：
 *   - PR-C1 (本 PR): 基建 + utils.ts + 5 utility functions
 *   - PR-C2: 5 EntityCompilers → 5 unified transformer plugins
 *   - PR-C3: mdast-validator → remark-canonical plugin
 *   - PR-C4: 收口 — 删 driver-registry / extract-* / oxl-md-* + 切到 work.md
 */

export {
  collectHeadings,
  findFirstHeading,
  collectHeadingContexts,
  collectListFields,
  parseMarkdown,
  stringifyMarkdown,
  countNodes,
  type CollectedHeading,
  type HeadingContext,
  type ListField,
} from './utils'
