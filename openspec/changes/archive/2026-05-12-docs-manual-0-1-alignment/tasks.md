## 1. 01-intro.md 重写

- [x] 1.1 删除"综合集成研讨厅"段落
- [x] 1.2 删除"工程化控制引擎"描述，替换为探索型定位
- [x] 1.3 重写架构图为 CLI-direct 模式
- [x] 1.4 删除"核心价值"表中的逃逸检测条目
- [x] 1.5 删除"围栏式 vs 放养式"对比表
- [x] 1.6 简化适用场景

## 2. 02-concepts.md 删减

- [x] 2.1 删除"系统角色"术语表中的 Core 引擎、降维执行器、负熵源
- [x] 2.2 删除"核心控制机制"术语表（明线/暗线、逃逸检测、模型逃逸）
- [x] 2.3 删除"核心原语"术语表（Sample）
- [x] 2.4 替换为简化版术语表（工程师、AI、oxn CLI、Blueprint、Stage、Proof、Probe、Arsenal、DRAFT/CANONICAL）
- [x] 2.5 更新 Stage 执行流程描述，删除 Core 引用
- [x] 2.6 修正"下一章"链接（02 → 03）

## 3. 03-lifecycle.md 重写

- [x] 3.1 删除"交互流程"图（Core 引擎为中心）
- [x] 3.2 删除"三种水流"（正常流/偏差流/演化流）
- [x] 3.3 删除 Sample 机制描述
- [x] 3.4 重写为 0.1 CLI-direct 实际流程
- [x] 3.5 删除 Mermaid 序列图
- [x] 3.6 替换为简单的命令序列示例
- [x] 3.7 更新目录结构描述（删除 core.oxn、space.oxn）
- [x] 3.8 添加"0.2 目标"章节简单标注 Daemon 相关功能

## 4. README.md (manual) 修正

- [x] 4.1 删除"综合集成研讨厅"描述
- [x] 4.2 替换"工程化控制引擎"为探索型描述
- [x] 4.3 修正命令签名：oxn task new → oxn task submit --blueprint
- [x] 4.4 "提交任务到 Core" → "提交任务"

## 5. 04-cli-ref.md 微调

- [x] 5.1 "Core 引擎生命周期" → "Daemon 进程生命周期"
- [x] 5.2 添加 0.2 目标标注

## 6. 05-arsenal.md 微调

- [x] 6.1 "Core Zod Schema 校验" → "Kernel Schema 校验"
- [x] 6.2 更新目录结构描述（如有）
- [x] 6.3 "/oxn-forge" → "oxn forge" CLI 命令引用

## 7. 06-troubleshooting.md 微调

- [x] 7.1 "Core 引擎无响应" → "Daemon 无响应"
- [x] 7.2 其他 Core → Daemon 术语替换

## 8. 07-dev.md 微调

- [x] 8.1 "Core 引擎守护进程" → "Daemon"
- [x] 8.2 git clone URL 修正为实际地址
- [x] 8.3 其他 Core → Daemon 术语替换
