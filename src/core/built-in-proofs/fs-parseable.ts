import { readFileSync, existsSync } from 'fs'
import { spawn } from 'bun'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

type ParserType = 'json' | 'typescript' | 'javascript' | 'python' | 'yaml'

export const fsParseableProof: BuiltInProofDefinition = {
  id: 'fs_parseable',
  name: 'File Parseable',
  layer: 'L1',
  description: 'Check if a file is syntactically parseable',
  
  validateInput(input: ProofInput): boolean {
    return (
      typeof input.path === 'string' && 
      input.path.length > 0 &&
      typeof input.parser === 'string' &&
      ['json', 'typescript', 'javascript', 'python', 'yaml'].includes(input.parser)
    )
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const path = input.path as string
    const parser = input.parser as ParserType
    
    try {
      const absolutePath = context.projectRoot 
        ? `${context.projectRoot}/${path}` 
        : path
      
      if (!existsSync(absolutePath)) {
        return {
          success: false,
          message: `File does not exist: ${path}`
        }
      }
      
      const content = readFileSync(absolutePath, 'utf-8')
      
      switch (parser) {
        case 'json':
          return parseJSON(content, absolutePath)
        
        case 'typescript':
        case 'javascript':
          return await parseJavaScript(content, absolutePath, parser)
        
        case 'python':
          return await parsePython(absolutePath)
        
        case 'yaml':
          return parseYAML(content, absolutePath)
        
        default:
          return {
            success: false,
            message: `Unsupported parser: ${parser}`
          }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error parsing file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

function parseJSON(content: string, path: string): ProofOutput {
  try {
    JSON.parse(content)
    return {
      success: true,
      message: `JSON is valid: ${path}`,
      data: {
        path,
        parser: 'json',
        valid: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `JSON parse error in ${path}: ${error instanceof Error ? error.message : String(error)}`,
      data: {
        path,
        parser: 'json',
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

async function parseJavaScript(content: string, path: string, parser: 'typescript' | 'javascript'): Promise<ProofOutput> {
  try {
    if (parser === 'json') {
      JSON.parse(content)
      return {
        success: true,
        message: `${parser.toUpperCase()} is valid: ${path}`,
        data: {
          path,
          parser,
          valid: true
        }
      }
    }
    
    const proc = spawn({
      cmd: ['node', '--check', path],
      stdout: 'pipe',
      stderr: 'pipe'
    })
    
    const exitCode = await proc.exited
    
    if (exitCode === 0) {
      return {
        success: true,
        message: `${parser.toUpperCase()} is valid: ${path}`,
        data: {
          path,
          parser,
          valid: true
        }
      }
    } else {
      const stderr = await new Response(proc.stderr).text()
      return {
        success: false,
        message: `${parser.toUpperCase()} syntax error in ${path}`,
        data: {
          path,
          parser,
          valid: false,
          error: stderr
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error parsing ${parser}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

async function parsePython(path: string): Promise<ProofOutput> {
  try {
    const proc = spawn({
      cmd: ['python3', '-m', 'py_compile', path],
      stdout: 'pipe',
      stderr: 'pipe'
    })
    
    const exitCode = await proc.exited
    
    if (exitCode === 0) {
      return {
        success: true,
        message: `Python is valid: ${path}`,
        data: {
          path,
          parser: 'python',
          valid: true
        }
      }
    } else {
      const stderr = await new Response(proc.stderr).text()
      return {
        success: false,
        message: `Python syntax error in ${path}`,
        data: {
          path,
          parser: 'python',
          valid: false,
          error: stderr
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error parsing Python: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

function parseYAML(content: string, path: string): ProofOutput {
  try {
    const yaml = require('yaml')
    yaml.parse(content)
    return {
      success: true,
      message: `YAML is valid: ${path}`,
      data: {
        path,
        parser: 'yaml',
        valid: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `YAML parse error in ${path}: ${error instanceof Error ? error.message : String(error)}`,
      data: {
        path,
        parser: 'yaml',
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

registerBuiltInProof(fsParseableProof)
