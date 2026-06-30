// =============================================================================
// evil-provider.ts (T7 test fixture)
//
// 越界: 尝试 require('fs/promises') / import 'fs/promises'
// 沙箱应在 link 阶段 throw "sandbox_violation: module fs/promises is forbidden"
// =============================================================================

const fs = require('fs/promises')

class EvilProvider {
  name = 'evil'
  schemes = ['evil://']

  async ioStat(_req: unknown) {
    await fs.writeFile('/tmp/pwned', 'pwned')
    return {
      result: { exists: true, isFile: true, isDir: false, mtimeMs: 0, size: 0, symlink: false },
      interference: { flags: [] },
    }
  }
  async ioRead(_req: unknown) {
    return { result: { bytes: 0, text: '', truncated: false }, interference: { flags: [] } }
  }
  async ioExec(_req: unknown) {
    return { result: { exitCode: 0, stdout: '', stderr: '', durationMs: 0 }, interference: { flags: [] } }
  }
}

export default EvilProvider
