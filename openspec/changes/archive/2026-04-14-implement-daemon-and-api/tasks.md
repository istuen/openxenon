## 1. Setup and Infrastructure

- [x] 1.1 Create `src/daemon/` directory structure
- [x] 1.2 Create `src/api/` directory structure
- [x] 1.3 Create `src/api/handlers/` directory
- [x] 1.4 Update `src/core/global.ts` with DAEMON_PID_PATH and DAEMON_LOG_PATH constants

## 2. Daemon Process Management

- [x] 2.1 Create `src/daemon/logger.ts` with logging functions (file + console)
- [x] 2.2 Create `src/daemon/process.ts` with startDaemon() function (spawn detached)
- [x] 2.3 Create `src/daemon/process.ts` with stopDaemon() function (read PID, send SIGTERM)
- [x] 2.4 Create `src/daemon/process.ts` with isDaemonRunning() function (check PID file and process)
- [x] 2.5 Create `src/daemon/status.ts` with getDaemonStatus() function
- [x] 2.6 Create `src/daemon/server.ts` with startServer() function (Bun.serve wrapper)
- [x] 2.7 Create `src/daemon/index.ts` to export all daemon utilities

## 3. HTTP API Server

- [x] 3.1 Create `src/api/server.ts` with Bun.serve configuration (port 8420)
- [x] 3.2 Create `src/api/router.ts` with route mapping
- [x] 3.3 Create `src/api/context.ts` with project context loading (X-Project-Path header)
- [x] 3.4 Create `src/api/errors.ts` with error response format utilities
- [x] 3.5 Create `src/api/validation.ts` with request validation utilities
- [x] 3.6 Create `src/api/index.ts` to export server and utilities

## 4. API Handlers

- [x] 4.1 Create `src/api/handlers/workspace-init.ts` for POST /api/v1/workspace/init
- [x] 4.2 Create `src/api/handlers/proofs-list.ts` for GET /api/v1/proofs/list
- [x] 4.3 Create `src/api/handlers/task-submit.ts` for POST /api/v1/task/submit
- [x] 4.4 Create `src/api/handlers/step-verify.ts` for POST /api/v1/step/verify
- [x] 4.5 Create `src/api/handlers/task-status.ts` for GET /api/v1/task/status
- [x] 4.6 Create `src/api/handlers/task-stop.ts` for POST /api/v1/task/stop
- [x] 4.7 Create `src/api/handlers/task-trace.ts` for GET /api/v1/task/trace
- [x] 4.8 Create `src/api/handlers/index.ts` to export all handlers

## 5. CLI Commands Update

- [x] 5.1 Update `src/commands/daemon.ts` start command to call real startDaemon()
- [x] 5.2 Update `src/commands/daemon.ts` stop command to call real stopDaemon()
- [x] 5.3 Update `src/commands/daemon.ts` status command to call real getDaemonStatus()

## 6. Server Entry Point

- [x] 6.1 Create `src/server.ts` as daemon server entry point
- [x] 6.2 Implement graceful shutdown handler for SIGTERM signal
- [x] 6.3 Initialize logging and PID file on server start

## 7. Integration and Testing

- [x] 7.1 Test `xn daemon start` spawns background process
- [x] 7.2 Test `xn daemon status` shows correct status
- [x] 7.3 Test `xn daemon stop` stops daemon correctly
- [x] 7.4 Test all 7 API endpoints with curl or Bun.fetch
- [x] 7.5 Test error handling (missing header, invalid JSON, etc.)
- [x] 7.6 Test project context switching via X-Project-Path header
- [x] 7.7 Test concurrent API requests

## 8. Documentation

- [x] 8.1 Update README.md with daemon usage instructions
- [x] 8.2 Document API endpoints with request/response examples
- [x] 8.3 Document error response format
- [x] 8.4 Document X-Project-Path header usage

## 9. Build and Package

- [x] 9.1 Rebuild CLI with `pnpm build`
- [x] 9.2 Test daemon functionality with built executable
- [x] 9.3 Verify daemon.log file creation
- [x] 9.4 Verify daemon.pid file management
