/**
 * LangiumOxlDriver — 基于 Langium 的 OXL Driver 实现（v0.2.0 兼容）
 *
 * 阶段：v0.3.0 Step 1.2
 * 角色：把现有 langium-driver 包装为 OxlDriver 接口
 *
 * 关键不变量：
 * - 内部仍使用 Langium 框架（chevrotain 解析）
 * - 对外暴露 OxlDocument 中性格式
 * - v0.5.0 后可被删除（届时只剩 mdast driver）
 */

import { createHash } from 'node:crypto'
import { URI } from 'langium'
import { createOxnParser, resetOxnServices, type OxnParseResult } from './oxn-services.js'
import { fs } from '@openxenon/engine/infra/filesystem.js'
import type { OxlDocument, OxlDriver, OxlDriverMetadata, OxlParseOptions } from '../contracts/oxl-driver.js'

export class LangiumOxlDriver implements OxlDriver {
  readonly name = 'langium' as const
  private parser = createOxnParser()

  async parse(content: string, options?: OxlParseOptions): Promise<OxlDocument> {
    const startTime = Date.now()
    const uri = options?.filePath ? URI.file(options.filePath) : URI.parse(`inmemory://oxl/${Date.now()}.oxn`)

    const result: OxnParseResult = await this.parser.parse(content, uri)

    return {
      uri: uri.toString(),
      content,
      ast: result.ast,
      driver: 'langium',
      parseErrors: result.parseErrors,
      lexerErrors: result.lexerErrors,
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
    resetOxnServices()
    this.parser = createOxnParser()
  }

  getMetadata(): OxlDriverMetadata {
    return {
      name: 'langium',
      fileExtensions: ['.oxn'],
      parserVersion: 'langium ^4.2.4',
      description: 'Langium-based OXL parser (v0.2.0 compatible)',
    }
  }
}
