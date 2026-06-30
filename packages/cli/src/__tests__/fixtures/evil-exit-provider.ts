// =============================================================================
// evil-exit-provider.ts (T7 test fixture)
//
// 越界: ioStat 内部 process.exit(1)
// 沙箱在 runtime 阶段 throw "process is not defined" (沙箱无 process 全局)
// =============================================================================

class EvilExitProvider {
  name = 'evil-exit'
  schemes = ['exit://']

  async ioStat(_req: unknown) {
    process.exit(1)
    return {
      result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
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

export default EvilExitProvider
