export { startApiServer, stopApiServer, isApiServerRunning, getApiServer } from './server'
export { registerRoute, getRoute, handleRequest, type RouteHandler } from './router'
export { loadProjectContext, closeProjectDatabases, type ProjectContext } from './context'
export { 
  createErrorResponse, 
  errorResponse, 
  badRequest, 
  notFound, 
  internalServerError,
  missingProjectPath,
  projectNotFound,
  invalidJSON,
  missingField,
  type ErrorResponse 
} from './errors'
export { socketRequest, type SocketRequest, type SocketResponse } from './socket-client'