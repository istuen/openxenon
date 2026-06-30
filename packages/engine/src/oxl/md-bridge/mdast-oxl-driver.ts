/**
 * MdastOxlDriver — 基于 unified + remark + mdast 的 OXL Driver（v0.3 阶段 2 入口）
 *
 * 阶段：v0.3.0 Step 1.2
 * 角色：解析 .md 格式 Intent 5 类资产
 *
 * 关键设计：
 * - 输入：.md 文件（Intent 5 类资产）
 * - 解析：unified + remark-parse + remark-directive + remark-frontmatter
 * - 输出：OxlDocument（ast 字段为 mdast Root）
 * - 依赖：unified 生态（v0.3 阶段 1 T1 引入）
 *
 * 关键不变量：
 * - 与 LangiumOxlDriver 行为一致（同样返回 OxlDocument）
 * - v0.3 阶段 1：仅 5 类 Intent 资产（domain/blueprint/work/task/proof）
 * - 14 builtin probe 函数体不变（v0.4 阶段迁移）
 */

import { createHash } from 'node:crypto'
import { fs } from '@openxenon/engine/infra/filesystem.js'
import type { OxlDocument, OxlDriver, OxlDriverMetadata, OxlParseOptions } from '../contracts/oxl-driver.js'

/**
 * mdast 节点最小子集（用 type-only import 避免 v0.3 阶段 1 强依赖）
 * 实际引入 deferred 到阶段 1 T1（unified 包）
 */
export interface MdastRoot {
  type: 'root'
  children: MdastNode[]
}

export interface MdastNode {
  type: string
  children?: MdastNode[]
  value?: string
  [key: string]: unknown
}

/**
 * 占位 mdast 解析器（v0.3 阶段 1 完整实现）
 *
 * 当前实现：返回最小 root + 提示
 * 完整实现：v0.3 阶段 1 T1-T3（unified pipeline）
 */
function placeholderMdParse(content: string): MdastRoot {
  return {
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 1,
        children: [{ type: 'text', value: content.split('\n')[0]?.replace(/^#\s*/, '') ?? '' }],
      },
    ],
  }
}

export class MdastOxlDriver implements OxlDriver {
  readonly name = 'mdast' as const

  async parse(content: string, options?: OxlParseOptions): Promise<OxlDocument> {
    const startTime = Date.now()
    const filePath = options?.filePath ?? `inmemory://oxl/${Date.now()}.md`
    const ast = placeholderMdParse(content)

    return {
      uri: filePath,
      content,
      ast,
      driver: 'mdast',
      parseErrors: [],
      lexerErrors: [],
      meta: {
        contentHash: createHash('sha256').update(content).digest('hex'),
        parseTime: Date.now() - startTime,
        entityType: options?.assetType,
      },
    }
  }

  async parseFile(filePath: string): Promise<OxlDocument> {
    const content = fs.read(filePath)
    if (content === null) {
      throw new Error(`Failed to read file: ${filePath}`)
    }
    return this.parse(content, { filePath })
  }

  reset(): void {
    // mdast 是无状态解析，reset 为空操作
  }

  getMetadata(): OxlDriverMetadata {
    return {
      name: 'mdast',
      fileExtensions: ['.md'],
      parserVersion: 'mdast-v0.3-placeholder',
      description: 'mdast-based OXL parser (v0.3 stage 2, placeholder)',
    }
  }
}
