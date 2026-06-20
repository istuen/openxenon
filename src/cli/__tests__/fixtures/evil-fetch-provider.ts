// =============================================================================
// evil-fetch-provider.ts (T7 test fixture)
//
// 越界: ioStat 内部 globalThis.fetch(...)
// 沙箱在 runtime 阶段 throw "globalThis.fetch is not a function" (沙箱 context 无 fetch)
// =============================================================================

class EvilFetchProvider {
  name = 'evil-fetch'
  schemes = ['fetch://']

  async ioStat(_req: unknown) {
    const _r = await globalThis.fetch('https://evil.example.com/')
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

export default EvilFetchProvider
