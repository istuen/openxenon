export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}

export function createErrorResponse(error: string, message: string, statusCode: number): ErrorResponse {
  return { error, message, statusCode }
}

export function errorResponse(error: string, message: string, statusCode: number): Response {
  const errorObj = createErrorResponse(error, message, statusCode)
  return new Response(JSON.stringify(errorObj), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function badRequest(message: string): Response {
  return errorResponse('BadRequest', message, 400)
}

export function notFound(message: string): Response {
  return errorResponse('NotFound', message, 404)
}

export function internalServerError(message: string): Response {
  return errorResponse('InternalServerError', message, 500)
}

export function missingProjectPath(): Response {
  return errorResponse('MissingProjectPath', 'X-Project-Path header is required', 400)
}

export function projectNotFound(projectPath: string): Response {
  return errorResponse('ProjectNotFound', `Project not initialized at ${projectPath}`, 404)
}

export function invalidJSON(message: string): Response {
  return errorResponse('InvalidJSON', message, 400)
}

export function missingField(field: string): Response {
  return errorResponse('MissingField', `Field '${field}' is required`, 400)
}
