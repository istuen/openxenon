/**
 * Version namespace barrel (D5+ 2026-08-07)
 *
 * 4 command 后端：
 *   - cutVersion：提议 next version + 列 active Goals
 *   - listVersions：读 package.json current version
 *   - showVersion：按 scheduled-version 字段匹配 Goals
 *   - versionStatus：按 status 聚合 + needsAttention 检测
 *
 * 命名空间区别于 Draft / Goal / Work
 */
export {
  cutVersion,
  listVersions,
  showVersion,
  versionStatus,
  proposeNextVersion,
  type VersionInput,
  type VersionCutResult,
  type VersionCutError,
  type VersionListResult,
  type VersionShowInput,
  type VersionShowResult,
  type VersionShowError,
  type VersionStatusResult,
} from './manager'
