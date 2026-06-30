// =============================================================================
// sample-s3-provider.ts (T7 test fixture)
//
// 合法 InfraProvider 实现: schemes = ['s3://', 's3s://'], 3 method 全部实现
// 由 src/cli/__tests__/probe-sandbox.test.ts + probe-add-e2e.test.ts 沙箱加载
// =============================================================================

class S3Provider {
  name = 's3'
  schemes = ['s3://', 's3s://']

  async ioStat(_req: unknown) {
    return {
      result: { exists: true, isFile: true, isDir: false, mtimeMs: Date.now(), size: 0, symlink: false },
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

export default S3Provider
