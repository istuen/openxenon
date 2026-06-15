// TODO(v0.2): Daemon radar 当前按单层 work (`works/<w>/state.json`) 监控。
// v0.2 需改为按 task 单元 (`works/<w>/tasks/<t>/state.json`) + workspace 聚合。
// 详见 docs/architecture/v01-ddd-dual-layer.md §6 文件布局
//       docs/zh-cn/architecture/ddd-dual-layer.md §6 文件布局

export { createLogger, daemonLogger, type Logger, type LogLevel, log } from './logger'
export {
  type DaemonProcessInfo,
  isDaemonRunning,
  type StartDaemonResult,
  startDaemon,
  startDaemonWithHealthCheck,
  stopDaemon,
} from './process'
export { getServer, isServerRunning, type ServerConfig, startServer, stopServer } from './server'
export { type DaemonStatus, getDaemonStatus } from './status'
// daemonStartup 在 src/infra/registry/ (L1-Infra), 供 daemon / cli 共同调用

import './ipc/handlers'
