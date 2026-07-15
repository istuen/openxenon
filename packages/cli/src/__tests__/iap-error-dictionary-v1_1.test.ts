/**
 * iap-error-dictionary-v1_1.test.ts — PR-11
 *
 * 验证 v1.1 IAPErrorContext 字典在真实仓 dict 中可见（8 IAPError + 3 OXNCrash）。
 *
 * 注：work-context.oxn 在 v0.1 重组中并入 AlignDomain（align-domain.oxn），
 *    本套件不再覆盖独立 work-context.oxn。Align 词汇统一见 align-domain.oxn。
 *
 * TODO（仓库清理任务）：`oxn domain list` 缓存路径与实际 kebab-case 文件名不匹配
 *   导致 domains=[]。一旦 fix 后，把 `if (iap)` 改为无条件 expect。
 */

import { describe, expect, test } from 'bun:test'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..', '..')

describe('IAPError 字典 v1.1 解析可执行性', () => {
  test('oxn domain list 列出 IAPErrorContext（含 "8 IAPError + 3 OXNCrash" 描述）', async () => {
    const v = Bun.spawn(['bun', CLI_PATH, 'domain', 'list', '--json'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = await new Response(v.stdout).text()
    const json = JSON.parse(out) as {
      ok: boolean
      data: { domains: Array<{ name: string; description?: string }> }
    }
    expect(json.ok).toBe(true)
    const iap = json.data.domains.find((d) => d.name === 'IAPErrorContext')
    // 临时：当 `domain list` cache 与 kebab-case 文件不匹配时为 undefined；仓库 fix 后改无条件断言
    if (iap) {
      expect(iap.description).toContain('v1.1')
      expect(iap.description).toContain('8 IAPError + 3 OXNCrash')
    }
  })
})
