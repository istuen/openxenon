#!/usr/bin/env bun
/**
 * check-asset-structure.test.ts — v3.2.1 新增 E_ASSET_RFC_ADR_CITATION 回归测试
 *
 * 覆盖 Bug 1 修复：
 *   - RFC-NNNN D25 形式（指向具体 Decision）→ 不应触发 E_ASSET_RFC_ADR_CITATION
 *   - RFC-NNNN 独立编号（无 D-section）→ 应触发
 *   - ADR-NNNN 同理
 *   - 占位符 RFC-XXXX / 路径模板 / 无编号字样 → 豁免
 *
 * 测策略：提取 RFC_ADR_NUMBERED 正则逻辑到本测试文件（同表达式），
 *   对 sample 行跑 .test() 验证触发/豁免；不依赖 .openxenon/ 子树状态。
 * （不直接 import 脚本内正则，因为 check-asset-structure.ts 是 CLI script
 *  而非 library 模块；同步正则定义是 v3.2.1 的可接受重复。）
 */

import { describe, expect, test } from 'bun:test'

// 与 scripts/check-asset-structure.ts:566 保持一致（v3.2.1 修复后）
const RFC_ADR_NUMBERED = /\b(?:RFC|ADR)-\d{3,4}(?!\s+D\d{1,3})\b/

describe('check-asset-structure E_ASSET_RFC_ADR_CITATION 正则 (v3.2.1)', () => {
  test('case A: RFC-NNNN D25 形式豁免（指向具体 Decision）', () => {
    const line = '- 禁止 Probe 承担主权验证角色——不产 frozen.json（RFC-0032 D25 删 Proof），不不可篡改。'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(false)
  })

  test('case A2: ADR-NNNN D[0-9]+ 形式豁免', () => {
    const line = '- 这是 ADR-0099 D5 决策点的引用，不是文档引用。'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(false)
  })

  test('case B: 独立 RFC-NNNN 编号触发', () => {
    const line = '- 引用了 RFC-0032 文档作为背景。'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(true)
  })

  test('case C: 独立 ADR-NNNN 编号触发', () => {
    const line = '- 引用了 ADR-0099 决策记录。'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(true)
  })

  test('case D: 无编号 "RFC" / "ADR" 字样豁免', () => {
    const line = '- 这是 RFC 概念定义，不是引用具体 RFC 文档。'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(false)
    const line2 = '- 这是 ADR 审核记录模板。'
    expect(RFC_ADR_NUMBERED.test(line2)).toBe(false)
  })

  test('case E: docs/rfc/zh-cn/ 路径模板豁免（不在正文中触发）', () => {
    // 路径中的 RFC-XXXX 不应被认作反向引用
    const line = '- 详见 docs/rfc/zh-cn/RFC-0001-init.md。'
    // 注意：此 case 当前会触发（路径里的 RFC-0001 是数字编号），
    // 但 check-asset-structure 的豁免清单说豁免，是基于文件名匹配豁免。
    // 我们这里只测正则行为，正则应触发（豁免在调用处处理）。
    expect(RFC_ADR_NUMBERED.test(line)).toBe(true)
  })

  test('case F: RFC-NNNN D 后面跟非数字（不是 Decision）触发', () => {
    const line = '- 引用了 RFC-0032 文档。 D25 in text.'
    expect(RFC_ADR_NUMBERED.test(line)).toBe(true)
  })
})
