## Context

`daemon start` 启动守护进程后，health check 超时失败。从日志看，Daemon PID 已记录但 health check 无法确认其状态。

## 问题分析

`waitForHealth` 函数存在以下问题：

1. **Socket 协议不匹配**：使用 `connect` 发送原始 JSON，但 socket server 期望的是按行分割的 JSON 协议
2. **未等待响应**：发送请求后立即返回 success，未验证实际响应
3. **超时时间可能不足**：默认 5000ms 可能不够

## Goals / Non-Goals

**Goals:**
- 修复 health check 超时问题
- 确保能正确检测 daemon 启动状态

**Non-Goals:**
- 不修改 socket server 协议

## 解决方案

1. **使用正确的协议格式**：socket server 使用换行符分隔的 JSON
2. **正确等待响应**：解析响应数据并验证 success 条件
3. **增加调试日志**：便于排查问题
