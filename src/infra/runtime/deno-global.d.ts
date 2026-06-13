// =============================================================================
// Deno global type augmentation
//
// 设计依据：arch-discussion §5.1 Deno 扩展方向 + design v0.3 §6.1
//
// 真实 Deno 进程会注入 globalThis.Deno；Bun/Node 下为 undefined。
// 我们用 type augmentation 让 TS 在任何 runtime 下都能编译通过。
//
// 注：types 不强制 runtime 一定有这些方法——Deno 子集是渐进采纳的。
// v0.1.6 Deno 适配只在「Deno 实际部署时」才会被加载（工厂检测 isDeno()）。
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var Deno:
    | {
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
          options?: { args?: readonly string[]; cwd?: string; env?: Record<string, string>; stdin?: 'inherit' | 'piped' | 'null'; stdout?: 'inherit' | 'piped' | 'null'; stderr?: 'inherit' | 'piped' | 'null' },
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
    | undefined
}

export {}
