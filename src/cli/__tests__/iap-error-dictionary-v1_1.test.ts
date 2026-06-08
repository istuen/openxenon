// =============================================================================
// iap-error-dictionary-v1_1.test.ts — PR-11
//
// 覆盖 IAPError 字典 v1.1 收敛：
//   1. IAPErrorContext 域的 IAPErrorCode term desc 描述 8 个错误码
//   2. 字典 invariant 收敛为 8 IAPError + 3 OXNCrash = 11
//   3. WorkContext 域含 v1.1 lock 守卫术语（BirthCert/PlanLock/AssetHash）
//   4. 3 个 v1.1 ALIGN 错误名（LOCK_NOT_FOUND/LOCK_HASH_MISMATCH/WORK_REMOVED）出现
//   5. ban 列表禁了 v1.0.2 废弃码（ALIGN_TIMEOUT/ALIGN_MISMATCH/INTENT_SLOT_CONFLICT）
//   6. oxn domain validate IAPErrorContext 解析通过（v1.1 语法）
//   7. oxn domain validate WorkContext 解析通过
//   8. v1.1 lock invariant 包含 "PlanLock" "LOCK_HASH_MISMATCH" "WORK_REMOVED" 关键词
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..')
const DOMAINS_DIR = join(PROJECT_ROOT, '.openxenon', 'domains')
const IAP_DOMAIN = join(DOMAINS_DIR, 'iap-error-context.oxn')
const WORK_DOMAIN = join(DOMAINS_DIR, 'work-context.oxn')

describe('IAPError 字典 v1.1 收敛（PR-11）', () => {
  test('1. IAPErrorContext 域文件含 8 个 IAPError 错误码描述', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    // v1.1 新增的 3 个 ALIGN 码
    expect(content).toContain('LOCK_NOT_FOUND')
    expect(content).toContain('LOCK_HASH_MISMATCH')
    expect(content).toContain('WORK_REMOVED')
    // 保留的 5 个 v1.0.2 码
    expect(content).toContain('CHECKLIST_MISSING')
    expect(content).toContain('INFRA_FAIL')
    expect(content).toContain('CRASH')
    expect(content).toContain('UNDEFINED_TERM')
    expect(content).toContain('NAME_FILE_MISMATCH')
  })

  test('2. IAPError 字典 v1.1 收敛为 8 + OXNCrash 3 = 11', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    // 字典收敛 invariant
    expect(content).toContain('IAPError 字典 v1.1 收敛为 8 个')
    expect(content).toContain('PROOF:2（INFRA_FAIL, CRASH）')
    expect(content).toContain('ALIGN:4（CHECKLIST_MISSING, LOCK_NOT_FOUND, LOCK_HASH_MISMATCH, WORK_REMOVED）')
    expect(content).toContain('INTENT:2（UNDEFINED_TERM, NAME_FILE_MISMATCH）')
    expect(content).toContain('OXNCrash 字典 v1.1 收敛为 3 个')
    expect(content).toContain('IAPError + OXNCrash 总数 = 11（8 + 3）')
  })

  test('3. IAPErrorCode term 描述 v1.1 共 8 个', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    expect(content).toMatch(/"IAPErrorCode":\s*"IAPError 的 code 字段（v1.1 共 8 个）/)
  })

  test('4. v1.0.2 废弃码仍在 ban 列表（防回归）', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    expect(content).toContain('"IAP_ALIGN_TIMEOUT"')
    expect(content).toContain('"IAP_ALIGN_MISMATCH"')
    expect(content).toContain('"IAP_INTENT_SLOT_CONFLICT"')
  })

  test('5. v1.0.2 废止的 AUTONOMOUS_RETRY 仍在 ban 列表', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    expect(content).toContain('"AUTONOMOUS_RETRY"')
  })

  test('6. v1.1 域含 lock 边界守卫术语（BirthCert/PlanLock/AssetHash/WorkRemoved）', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    expect(content).toMatch(/"BirthCert":/)
    expect(content).toMatch(/"PlanLock":/)
    expect(content).toMatch(/"AssetHash":/)
    expect(content).toMatch(/"WorkRemoved":/)
    expect(content).toMatch(/"V0ToV1Migrate":/)
  })

  test('7. v1.1 域含 lock 守卫 invariant（PR-8/9 守卫 + PR-10 迁移）', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    expect(content).toContain('Lock 边界三剑客')
    expect(content).toContain('PlanLock 缺位 → 抛 IAP_ALIGN_LOCK_NOT_FOUND')
    expect(content).toContain('PlanLock hash 漂移（4 组件')
    expect(content).toContain('PlanLock 全过但 work.oxn 失踪')
    expect(content).toContain('Lock 守卫次序：先校验 planLock 存在')
    expect(content).toContain('--no-lock-check 用于诊断模式')
    expect(content).toContain('oxn work lock 子命令（PR-7）')
    expect(content).toContain('oxn work migrate（PR-10）')
  })

  test('8. WorkContext 域含 v1.1 lock 术语 + 迁移术语', () => {
    const content = readFileSync(WORK_DOMAIN, 'utf-8')
    expect(content).toMatch(/"BirthCert":/)
    expect(content).toMatch(/"PlanLock":/)
    expect(content).toMatch(/"AssetHash":/)
    expect(content).toMatch(/"WorkLayoutV0":/)
    expect(content).toMatch(/"WorkLayoutV1":/)
    expect(content).toMatch(/"MigratedV0Dir":/)
  })

  test('9. WorkContext 域含 v1.1 lock invariant + migrate invariant', () => {
    const content = readFileSync(WORK_DOMAIN, 'utf-8')
    expect(content).toContain('Work 必须经过 validate → lock 才能 run/context')
    expect(content).toContain('锁状态在 .work.planLock 静态卡中')
    expect(content).toContain('lock 后任何 .oxn 资产漂移')
    expect(content).toContain('LOCK_HASH_MISMATCH')
    expect(content).toContain('Work 必须存在 .run/state.json（V1 布局）')
    expect(content).toContain('MigratedV0Dir 保留 V0 备份供审计')
  })

  test('10. IAPError v1.1 与 v1.0.2 唯一差异：ALIGN 轴 +3（lock 守卫）', () => {
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    // v1.0.2: ALIGN:1（CHECKLIST_MISSING）
    // v1.1:   ALIGN:4（CHECKLIST_MISSING, LOCK_NOT_FOUND, LOCK_HASH_MISMATCH, WORK_REMOVED）
    // 验证 ALIGN 计数从 1 变 4
    const alignOld = /ALIGN:1（CHECKLIST_MISSING）/
    const alignNew = /ALIGN:4（CHECKLIST_MISSING, LOCK_NOT_FOUND, LOCK_HASH_MISMATCH, WORK_REMOVED）/
    expect(content).not.toMatch(alignOld)
    expect(content).toMatch(alignNew)
  })
})

describe('IAPError 字典 v1.1 解析可执行性', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-iap-validate-'))
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('11. oxn init + domain validate IAPErrorContext 解析通过', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    expect(init.exitCode).toBe(0)

    // 拷贝真实 IAPErrorContext 域文件
    const content = readFileSync(IAP_DOMAIN, 'utf-8')
    mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'domains', 'iap-error-context.oxn'), content)

    // 解析验证
    const v = Bun.spawn(['bun', CLI_PATH, 'domain', 'validate', 'IAPErrorContext', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = await new Response(v.stdout).text()
    const json = JSON.parse(out)
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('IAPErrorContext')
    expect(json.data.description).toContain('v1.1')
  })

  test('12. oxn init + domain validate WorkContext 解析通过', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    expect(init.exitCode).toBe(0)

    const content = readFileSync(WORK_DOMAIN, 'utf-8')
    mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'domains', 'work-context.oxn'), content)

    const v = Bun.spawn(['bun', CLI_PATH, 'domain', 'validate', 'WorkContext', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = await new Response(v.stdout).text()
    const json = JSON.parse(out)
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('WorkContext')
    expect(json.data.description).toContain('v1.1')
  })

  test('13. 真实项目 oxn domain list 列出 v1.1 IAPErrorContext', async () => {
    const v = Bun.spawn(['bun', CLI_PATH, 'domain', 'list', '--json'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = await new Response(v.stdout).text()
    const json = JSON.parse(out)
    expect(json.ok).toBe(true)
    const iap = json.data.domains.find((d) => d.name === 'IAPErrorContext')
    expect(iap).toBeDefined()
    expect(iap.description).toContain('v1.1')
    expect(iap.description).toContain('8 IAPError + 3 OXNCrash')
  })

  test('14. 真实项目 oxn domain list 列出 v1.1 WorkContext', async () => {
    const v = Bun.spawn(['bun', CLI_PATH, 'domain', 'list', '--json'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = await new Response(v.stdout).text()
    const json = JSON.parse(out)
    expect(json.ok).toBe(true)
    const wc = json.data.domains.find((d) => d.name === 'WorkContext')
    expect(wc).toBeDefined()
    expect(wc.description).toContain('v1.1')
    expect(wc.description).toContain('lock 边界守卫')
  })
})
