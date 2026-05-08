import type { ProofInput } from './lib/types/proof'

export interface CustomProofParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description?: string
  default?: unknown
  enum?: unknown[]
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
}

export interface CustomProofConfigSchema {
  [key: string]: CustomProofParameterSchema
}

export const STANDARD_PROOF_SCHEMAS: Record<string, CustomProofConfigSchema> = {
  'fs_exists': {
    path: {
      type: 'string',
      required: true,
      description: 'File or directory path to check'
    }
  },
  
  'fs_not_exists': {
    path: {
      type: 'string',
      required: true,
      description: 'File or directory path to check for non-existence'
    }
  },
  
  'fs_content_match': {
    path: {
      type: 'string',
      required: true,
      description: 'File path to read'
    },
    pattern: {
      type: 'string',
      required: true,
      description: 'Regex pattern to match against file content'
    }
  },
  
  'fs_parseable': {
    path: {
      type: 'string',
      required: true,
      description: 'File path to parse'
    },
    parser: {
      type: 'string',
      required: true,
      description: 'Parser type (e.g., json, typescript, javascript)',
      enum: ['json', 'typescript', 'javascript', 'python', 'yaml']
    }
  },
  
  'exec_exit_zero': {
    command: {
      type: 'string',
      required: true,
      description: 'Command to execute'
    },
    cwd: {
      type: 'string',
      required: false,
      description: 'Working directory for command execution'
    }
  },
  
  'exec_stdout_match': {
    command: {
      type: 'string',
      required: true,
      description: 'Command to execute'
    },
    pattern: {
      type: 'string',
      required: true,
      description: 'Regex pattern to match against stdout'
    },
    cwd: {
      type: 'string',
      required: false,
      description: 'Working directory for command execution'
    }
  },
  
  'db_query_bool': {
    connection: {
      type: 'string',
      required: true,
      description: 'Database connection string or connection name'
    },
    sql: {
      type: 'string',
      required: true,
      description: 'SQL query to execute (must return a single boolean value)'
    }
  },
  
  'env_exists': {
    key: {
      type: 'string',
      required: true,
      description: 'Environment variable key name'
    }
  },
  
  'http_status': {
    url: {
      type: 'string',
      required: true,
      description: 'URL to check'
    },
    method: {
      type: 'string',
      required: false,
      description: 'HTTP method',
      default: 'GET',
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    },
    expected_status: {
      type: 'number',
      required: true,
      description: 'Expected HTTP status code',
      minimum: 100,
      maximum: 599
    }
  }
}

export function validateProofInput(
  proofId: string,
  input: ProofInput
): { valid: boolean; errors?: string[] } {
  const schema = STANDARD_PROOF_SCHEMAS[proofId]
  
  if (!schema) {
    return { valid: true }
  }
  
  const errors: string[] = []
  
  for (const [key, paramSchema] of Object.entries(schema)) {
    const value = input[key]
    
    if (paramSchema.required && (value === undefined || value === null)) {
      errors.push(`Missing required parameter: ${key}`)
      continue
    }
    
    if (value === undefined || value === null) {
      continue
    }
    
    const actualType = Array.isArray(value) ? 'array' : typeof value
    if (actualType !== paramSchema.type) {
      errors.push(`Invalid type for ${key}: expected ${paramSchema.type}, got ${actualType}`)
    }
    
    if (paramSchema.enum && !paramSchema.enum.includes(value)) {
      errors.push(`Invalid value for ${key}: must be one of ${paramSchema.enum.join(', ')}`)
    }
    
    if (paramSchema.pattern && typeof value === 'string') {
      const regex = new RegExp(paramSchema.pattern)
      if (!regex.test(value)) {
        errors.push(`Invalid format for ${key}: must match pattern ${paramSchema.pattern}`)
      }
    }
    
    if (paramSchema.minLength !== undefined && typeof value === 'string' && value.length < paramSchema.minLength) {
      errors.push(`${key} must be at least ${paramSchema.minLength} characters`)
    }
    
    if (paramSchema.maxLength !== undefined && typeof value === 'string' && value.length > paramSchema.maxLength) {
      errors.push(`${key} must be at most ${paramSchema.maxLength} characters`)
    }
    
    if (paramSchema.minimum !== undefined && typeof value === 'number' && value < paramSchema.minimum) {
      errors.push(`${key} must be at least ${paramSchema.minimum}`)
    }
    
    if (paramSchema.maximum !== undefined && typeof value === 'number' && value > paramSchema.maximum) {
      errors.push(`${key} must be at most ${paramSchema.maximum}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}

export function getProofSchema(proofId: string): CustomProofConfigSchema | undefined {
  return STANDARD_PROOF_SCHEMAS[proofId]
}

export function serializeProofInput(input: ProofInput): string {
  return JSON.stringify(input)
}

export function deserializeProofInput(json: string): ProofInput {
  try {
    return JSON.parse(json)
  } catch {
    throw new Error('Invalid proof input JSON')
  }
}
