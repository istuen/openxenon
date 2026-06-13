// =============================================================================
// Type shim: which (npm)
//
// 用途：npm 'which' 包没有自带类型；用 module declaration 兜底
// API: which(cmd, opts?) → Promise<string> | throws Error
//   - `nothrow: true` 选选项：找不到时不抛错，返回 null（适配层自己处理）
//   - `PATH` 选项：自定义 PATH
// =============================================================================

declare module 'which' {
  interface WhichOptions {
    /** 设置自定义 PATH（覆盖 process.env.PATH） */
    PATH?: string
    /** 找不到时不抛错，返回 null */
    nothrow?: boolean
    /** 行为模式：'shell' 用 shell 内置 which；'exec' 用 execvp */
    mode?: 'shell' | 'exec'
  }

  function which(
    cmd: string,
    options?: WhichOptions,
  ): Promise<string | null>

  export default which
}
