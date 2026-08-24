// =============================================================================
// CLI E2E (Phase 2 placeholder)
//
// RFC-0032 Phase 2 (2026-08-23): 原 'CLI 4-Tier E2E (Phase 4)' describe 块已删。
// 5 tests 全部断言 `oxn proof` 命令行为 — oxn proof 命令族 RFC-0032 D25 退场,
// 4-Tier E2E 内容对应 N/A (oxn proof 命令已不存在)。
//
// 概念保留:
//   档 1 (IAPError)  → stdout JSON + exit 1
//   档 2 (OXNCrash)  → stderr + exit 2
//   档 3 (CliInput)  → stdout JSON + exit 1
//   档 4 (兜底)      → stderr + exit 2
//
// Phase 3+ 重新引入时: 应针对 `oxn probe` 命令族重新设计 4-Tier E2E 套件
// (probe 才是 D27 保留的 Engine 工具能力入口)。
// =============================================================================

import { describe, test } from 'bun:test'

describe('CLI 4-Tier E2E (Phase 4)', () => {
  test('Phase 3+ placeholder', () => {
    // 原 4-Tier E2E 已删 (oxn proof 命令族退场)
    // Phase 3+ 将针对 oxn probe 重新设计
    // 占位 — 不调用 expect (未 import)
  })
})
