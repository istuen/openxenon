// =============================================================================
// Runtime Adapter — Type B (Infra Contract)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md
//   - §4.1 目录结构（v0.3 拍板版：双目录 + 工厂）
//   - §5  Type A vs Type B 接口分类
//   - §5.4 RuntimePort 归属 Type B（arch-discussion §4 Q3=B）
//
// Type B 含义（arch-discussion §3）：
//   - 接口定义在 L1-Infra 内部（不是 L0-Contract）
//   - 消费者是 L1/L2/L3 业务代码（probe handler），不是 kernel 纯函数
//   - 注入方式：直接模块 import + 工厂模式（非函数参数）
//   - 不经过 kernel/index re-export
//
// 与 FileSystemPort (Type A) 的关系（§11.3）：
//   - FileSystemPort 在 L0-Contract，同步基础原语，kernel 内部用
//   - 本接口在 L1-Infra，异步高级抽象，probe handler 用
//   - 两条独立路径，不重叠
//
// v0.1.6 锁定字段（§7.1 API 映射表）：
//   - SpawnResult.stdout/stderr 强制 string（消除 ReadableStream vs Readable 差异）
//   - SpawnResult.exitCode = null 表示被信号杀死
//   - SpawnOptions.timeout 默认 30_000ms
//   - FileHandle 抽象 Bun.file 的 text/json/exists/size/write
// =============================================================================

/** spawn 返回结构（统一错误契约） */
export interface SpawnResult {
  /** 进程退出码；0 = 成功；非 0 = 失败；null = 被信号杀死或 spawn 失败 */
  exitCode: number | null
  /** 强制缓冲为 string（v0.1.6 锁定） */
  stdout: string
  /** 强制缓冲为 string */
  stderr: string
  /** spawn 到 close 的总耗时（ms） */
  durationMs: number
  /** 进程被哪个信号杀死（null = 自然退出） */
  signal: NodeJS.Signals | null
}

/** spawn 调用选项 */
export interface SpawnOptions {
  /** 工作目录（默认 process.cwd()） */
  cwd?: string
  /** 环境变量（默认 process.env） */
  env?: Record<string, string>
  /** 超时（ms），默认 30_000。超时统一 SIGKILL（§16 Q4）*/
  timeout?: number
  /** stdin 输入（spawn 才有意义） */
  stdin?: string | Buffer
}

/** openFile 返回的文件句柄（抽象 Bun.file） */
export interface FileHandle {
  /** 读全文为 utf-8 string */
  text(): Promise<string>
  /** 读全文并 JSON.parse */
  json(): Promise<unknown>
  /** 文件是否存在（fs.access 替代） */
  exists(): Promise<boolean>
  /** 文件大小（bytes；同步 API；Node 路径用 fs.statSync） */
  size(): number
  /** 写入文件（覆盖） */
  write(data: string | Buffer): Promise<void>
}

/** glob 调用选项 */
export interface GlobOptions {
  /** 扫描根目录（默认 process.cwd()） */
  cwd?: string
  /** 是否忽略大小写 */
  nocase?: boolean
  /** 排除 pattern（多个） */
  ignore?: string[]
}

/** RuntimePort — Type B 接口契约（§5.4） */
export interface RuntimePort {
  /** 跨 runtime 的统一 spawn（v0.1.6 强制缓冲 stdout/stderr） */
  spawn(cmd: string[], opts?: SpawnOptions): Promise<SpawnResult>
  /** 打开文件（返回 FileHandle，方法异步） */
  openFile(path: string): Promise<FileHandle>
  /** glob 模式匹配 */
  glob(pattern: string, opts?: GlobOptions): Promise<string[]>
  /** 跨平台 which（Windows 兼容走 npm 'which' 包） */
  which(cmd: string): Promise<string | null>
  /** 当前 runtime 名称（'bun' / 'node' / 'deno' / 'unknown'） */
  readonly name: 'bun' | 'node' | 'deno' | 'unknown'
}
