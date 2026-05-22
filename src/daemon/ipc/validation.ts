export async function parseJSONBody<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text()
    if (!text) {
      return null
    }
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error('Invalid JSON body')
  }
}

export function validateRequiredFields(
  obj: Record<string, unknown>,
  fields: string[],
): { valid: boolean; missingField?: string } {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) {
      return { valid: false, missingField: field }
    }
  }
  return { valid: true }
}

export function getProjectPath(request: Request): string | null {
  return request.headers.get('X-Project-Path')
}

export function getQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) {
    return {}
  }

  const queryString = url.substring(queryIndex + 1)
  const params: Record<string, string> = {}

  for (const pair of queryString.split('&')) {
    if (!pair) continue
    const eqIndex = pair.indexOf('=')
    if (eqIndex === -1) {
      if (pair) params[decodeURIComponent(pair)] = ''
      continue
    }
    const key = pair.substring(0, eqIndex)
    const value = pair.substring(eqIndex + 1)
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    }
  }

  return params
}
