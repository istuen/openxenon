/**
 * work-skeleton.test.ts — 🆕 v0.7: renderWorkSkeleton 单元测试
 *
 * 覆盖：
 *  - work.md 生成含 ## Use 段（替代旧 ## Refs）
 *  - work.md ref path 用 @prj/blueprints/（替代旧 @prj/workflows/）
 *  - boundary 列表被正确序列化为 ## Tasks 段下的 ### task
 *  - 多 blueprint refs（options.blueprintNames）正确输出
 *  - goal / constraints 通过 options 注入
 */

import { describe, test, expect } from 'bun:test'
import { renderWorkSkeleton } from '../work-skeleton.js'

describe('renderWorkSkeleton (v0.7: Use + Boundaries)', () => {
  test('生成 work.md 含 ## Use 段（替代 ## Refs）', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'diagnose', align: 'Diagnose' }], 'md')
    expect(md).toContain('## Use')
    expect(md).not.toContain('## Refs')
  })

  test('work.md ref path 指向 @prj/blueprints/（替代旧 @prj/workflows/）', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'diagnose', align: 'Diagnose' }], 'md')
    expect(md).toContain('ref: "@prj/blueprints/fix-issue"')
    expect(md).not.toContain('@prj/workflows/')
  })

  test('boundary 列表生成 ## Tasks 段下的 ### task 条目', () => {
    const boundaries = [
      { name: 'diagnose', align: 'Diagnose' },
      { name: 'fix', align: 'Fix' },
      { name: 'verify', align: 'Verify' },
    ]
    const md = renderWorkSkeleton('my-work', 'fix-issue', boundaries, 'md')
    expect(md).toContain('## Tasks')
    expect(md).toContain('### diagnose')
    expect(md).toContain('### fix')
    expect(md).toContain('### verify')
    expect(md).toContain('TODO: 描述 diagnose 阶段要做什么')
    expect(md).toContain('TODO: 描述 fix 阶段要做什么')
    expect(md).toContain('TODO: 描述 verify 阶段要做什么')
  })

  test('boundary.task 行含 blueprint 字段', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'diagnose', align: 'Diagnose' }], 'md')
    expect(md).toContain('- blueprint: fix-issue')
  })

  test('多 blueprint refs（options.blueprintNames）正确输出 ## Use 段', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'fix', align: 'Fix' }], 'md', {
      blueprintNames: ['fix-issue', 'dev-workflow'],
    })
    expect(md).toContain('### fix-issue')
    expect(md).toContain('### dev-workflow')
    expect(md).toContain('ref: "@prj/blueprints/fix-issue"')
    expect(md).toContain('ref: "@prj/blueprints/dev-workflow"')
  })

  test('goal / constraints 通过 options 注入（无 TODO 占位）', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'fix', align: 'Fix' }], 'md', {
      goal: '修复支付回调的幂等性',
      constraints: ['不修改 api/payment.ts', '保持向后兼容'],
    })
    expect(md).toContain('goal: 修复支付回调的幂等性')
    expect(md).not.toContain('goal: TODO:')
    expect(md).toContain('- 不修改 api/payment.ts')
    expect(md).toContain('- 保持向后兼容')
    expect(md).not.toContain('TODO: 列出硬约束')
  })

  test('无 options 时保留 TODO 占位（向后兼容）', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [{ name: 'fix', align: 'Fix' }], 'md')
    expect(md).toContain('goal: TODO: 描述这个 work 要达成什么')
    expect(md).toContain('TODO: 列出硬约束')
    expect(md).toContain('TODO: 描述 fix 阶段要做什么')
  })

  test('空 boundaries 列表不生成 ## Tasks 段', () => {
    const md = renderWorkSkeleton('my-work', 'fix-issue', [], 'md')
    expect(md).not.toContain('## Tasks')
  })
})
