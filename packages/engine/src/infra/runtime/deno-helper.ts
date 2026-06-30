// =============================================================================
// Deno Runtime — shared helper (v0.1.7 fix)
// =============================================================================
//
// 问题 (pre-existing): deno-global.d.ts 用 `declare global { var Deno: ... }`
// 在 macOS tsc 通过 'include: src/**/*' 自动拉取, 但 Linux tsc 解析路径
// 不同, 报 'globalThis has no index signature' (TS7017).
//
// 修复: 集中 `globalThis.Deno` 访问到本 helper, 用明确的 type assertion
// (`as unknown as { ... }`) 绕开 declare global 在跨 OS 上的不一致.
// 真实 Deno 进程仍会注入 globalThis.Deno, 这里只是把类型 cast 集中.
// =============================================================================

interface DenoGlobal {
  readonly version: { deno: string; v8: string; typescript: string }
  readonly pid: number
  readonly cwd: () => string | Promise<string>
  readonly env: { get(key: string): string | undefined; toObject(): Record<string, string> }
  readonly args: readonly string[]
  readonly exit: (code?: number) => never
  readonly build: {
    os: 'darwin' | 'linux' | 'windows' | 'freebsd' | 'openbsd' | 'netbsd' | 'solaris' | 'aix'
    arch: 'x86_64' | 'aarch64' | 'arm' | 'riscv64' | 's390x' | 'loong64' | 'ia32' | 'mips64el' | 'ppc64' | 'ppc64le'
  }
  command: (
    cmd: string,
    options?: {
      args?: readonly string[]
      cwd?: string
      env?: Record<string, string>
      stdin?: 'inherit' | 'piped' | 'null'
      stdout?: 'inherit' | 'piped' | 'null'
      stderr?: 'inherit' | 'piped' | 'null'
    },
  ) => Promise<{ code: number; success: boolean; stdout: Uint8Array; stderr: Uint8Array; signal: number | null }>
  readTextFile: (path: string) => Promise<string>
  readFile: (path: string) => Promise<Uint8Array>
  writeTextFile: (path: string, data: string) => Promise<void>
  writeFile: (path: string, data: Uint8Array) => Promise<void>
  stat: (path: string) => Promise<{ isFile: boolean; isDirectory: boolean; isSymlink: boolean; size: number }>
  lstat: (path: string) => Promise<{ isFile: boolean; isDirectory: boolean; isSymlink: boolean; size: number }>
  remove: (path: string, options?: { recursive?: boolean }) => Promise<void>
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  readDir: (path: string) => AsyncIterable<{ name: string; isFile: boolean; isDirectory: boolean }>
  readLink: (path: string) => Promise<string>
  realPath: (path: string) => Promise<string>
  envToObject: () => Record<string, string>
}

/**
 * Get the Deno global from globalThis with explicit type assertion.
 * 返回 undefined 如果 Deno 不可用 (Bun/Node runtime).
 */
export function getDeno(): DenoGlobal | undefined {
  return (globalThis as unknown as { Deno?: DenoGlobal }).Deno
}
