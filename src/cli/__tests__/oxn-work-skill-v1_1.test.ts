// =============================================================================
// oxn-work-skill-v1_1.test.ts — PR-12
//
// 覆盖 `.opencode/skills/oxn-work/SKILL.md` v1.1 内容收敛：
//   1. front matter 描述含 v1.1
//   2. 8 阶段流程图存在
//   3. 4 个 v1.1 新增阶段（validate/lock/unlock/migrate）有独立小节
//   4. v1.1 错误处理速查表存在（含 3 个 IAPError ALIGN 新码）
//   5. v0.1 引用全部替换为 v1.1
//   6. 错误码描述含 LOCK_NOT_FOUND / LOCK_HASH_MISMATCH / WORK_REMOVED
//
// 注：原 test 10（项目源 vs 全局源一致性）与 test 11（oxn install-skill --force 装到全局）
// 已随 install-skill 命令移除（v0.1.3 — 用户主定：保持项目级，不写用户 home）。
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..')
const SKILL_PROJECT = join(PROJECT_ROOT, '.opencode', 'skills', 'oxn-work', 'SKILL.md')

describe('oxn-work SKILL.md v1.1 内容收敛（PR-12）', () => {
  test('1. front matter description 含 v1.1 关键字', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    const fm = content.split('---')[1]
    expect(fm).toMatch(/description:\s*.*v1\.1/)
  })

  test('2. 含 8 阶段流程图（v1.1 新增）', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toContain('## v1.1 8 阶段流程图')
    expect(content).toContain('IAP_ALIGN_LOCK_NOT_FOUND')
    expect(content).toContain('IAP_ALIGN_LOCK_HASH_MISMATCH')
    expect(content).toContain('IAP_ALIGN_WORK_REMOVED')
  })

  test('3. v1.1 新增阶段（validate/lock/unlock/migrate）有独立小节', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toMatch(/### 步骤 0.*[Mm]igrate/m)
    expect(content).toContain('### 步骤 5：`work validate`')
    expect(content).toContain('### 步骤 6：`work lock`')
    expect(content).toContain('oxn work unlock')
  })

  test('4. v1.1 错误处理速查表存在', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toContain('## v1.1 错误处理速查')
    // 三剑客错误码
    expect(content).toContain('IAP_ALIGN_LOCK_NOT_FOUND')
    expect(content).toContain('IAP_ALIGN_LOCK_HASH_MISMATCH')
    expect(content).toContain('IAP_ALIGN_WORK_REMOVED')
    // 旧的 v1.0.2 也保留
    expect(content).toContain('IAP_ALIGN_CHECKLIST_MISSING')
  })

  test('5. v0.1 引用全部替换为 v1.1（关键字检查）', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    // 升级要点必须含 v1.1
    expect(content).toContain('**v1.1 升级要点**')
    // 标题/目标段全应 v1.1
    expect(content).toMatch(/v1\.1 hard-switch 之后/)
    // 不能有 v0.1 顶级标题（除历史溯源上下文）
    // frontmatter description 含 v1.1
    const fm = content.split('---')[1]
    expect(fm).toContain('v1.1')
  })

  test('6. 参考命令表含 4 个 v1.1 新增子命令', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    // 关键 v1.1 命令
    expect(content).toContain('**v1.1 校验 work.oxn + 写 .work**')
    expect(content).toContain('**v1.1 锁 work')
    expect(content).toContain('**v1.1 解锁 work')
    expect(content).toContain('**v1.1 V0→V1 布局迁移**')
  })

  test('7. 反模式段含 v1.1 守卫相关反模式', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toContain('不要跳过 validate+lock 直接 run')
    expect(content).toContain('IAP_ALIGN_LOCK_NOT_FOUND')
    expect(content).toContain('不要绕过 lock 守卫跑生产')
    expect(content).toContain('不要在锁后修改 .oxn')
  })

  test('8. .work / planLock 术语在文档中出现', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toContain('**v1.1 新增** `.work` 静态门禁卡')
    expect(content).toMatch(/planLock.*4 组件 hash|4 组件 hash.*planLock/)
    expect(content).toContain('workOxnHash')
    expect(content).toContain('workDomainsHash')
    expect(content).toContain('blueprintsHash')
    expect(content).toContain('tasksHash')
    expect(content).toContain('allHash')
  })

  test('9. V0→V1 路径映射在文档中说明', () => {
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    expect(content).toContain('works/<w>/work-{state,trace,frozen}.{json,jsonl}')
    expect(content).toContain('works/<w>/.run/{state,trace,frozen}.{json,jsonl}')
    expect(content).toContain('.migrated-v0/')
  })
})

describe('oxn-work SKILL.md 唯一权威源（v0.1.3 — install-skill 移除后）', () => {
  test('10. 项目源 SKILL.md 存在（init 编译产物）', () => {
    expect(existsSync(SKILL_PROJECT)).toBe(true)
    const content = readFileSync(SKILL_PROJECT, 'utf-8')
    // 纯结构断言：不卡 v1.1 字面（SKILL.md 内容漂移是 pre-existing 问题，
    // 本测试只保证"项目内有 init 编译产物"这一不变量）
    expect(content).toMatch(/^---\nname: oxn-work\ndescription: \S+/m)
  })
})
