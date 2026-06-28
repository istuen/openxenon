/**
 * src/infra/filesystem-async.ts
 * 异步 IO 收口层（与 src/infra/filesystem.ts 同步层对称）
 *
 * Sprint 1 T1b: 把散落的 'fs/promises' / 'node:fs/promises' 直引
 * 统一收口到本模块的 asyncFs 命名空间。
 *
 * 设计原则:
 * - 同步 IO 走 src/infra/filesystem.ts
 * - 异步 IO 走 src/infra/filesystem-async.ts (本文件)
 * - 不重复实现: 直接 re-export 'node:fs/promises' 的核心 API
 * - 提供 asyncFs 命名空间对象 (与 fs (sync) 命名空间对称)
 *
 * v0.1.x 兼容: 同时导出顶层符号 (access, mkdir, readdir, readFile, writeFile)
 * 供现有 import 直接替换 source 路径
 */
import { access, chmod, mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'

/** asyncFs 命名空间对象 (与 src/infra/filesystem.ts 的 fs 对称) */
export const asyncFs = {
  access,
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
}

/** 顶层符号 re-export (供 import 直接替换 source 路径) */
export { access, chmod, mkdir, readdir, readFile, rename, unlink, writeFile }
