import type { URI } from 'langium'
import type { OxnServices } from './oxn-services'

export type OxnParseResult = {
  uri: URI
  content: string
  ast: unknown
  parseErrors: string[]
  lexerErrors: string[]
}

export class OxnParser {
  private services: Promise<OxnServices>

  constructor(services: Promise<OxnServices>) {
    this.services = services
  }

  async parse(content: string, uri: URI): Promise<OxnParseResult> {
    const services = await this.services
    const factory = services.shared.workspace.LangiumDocumentFactory
    const doc = factory.fromString(content, uri, undefined)
    return {
      uri,
      content,
      ast: doc.parseResult?.value,
      parseErrors: (doc.parseResult?.parserErrors || []).map((e: { message: string }) => e.message),
      lexerErrors: (doc.parseResult?.lexerErrors || []).map((e: { message: string }) => e.message),
    }
  }
}
