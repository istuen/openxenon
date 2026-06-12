## Context

当前文档状态：
- README.md：~2700 行，臃肿且部分命令已过时
- docs/manual/：6 个文件，内容部分过时
- docs/architecture.md：唯一架构权威

技术栈：TypeScript, Bun
架构原则：AI 不被信任 / Kernel 是兰姆达真空 / Infra 是唯一物理出口

## Goals / Non-Goals

**Goals:**
- README.md 精简至 < 150 行
- 文档结构清晰，引用关系明确
- 单一真相源原则（docs/architecture.md 为架构权威）
- Skill 系统不写入人类可读文档（AI 读源码）

**Non-Goals:**
- 不修改代码实现
- 不创建新的 spec 文件（仅文档重组）
- 不在 manual 中重复 architecture.md 内容

## Decisions

1. **README 结构：快速入口 + 导航**
   - 保留：一句话简介、快速开始、CLI 速查、文档导航、从源码构建
   - 删除：Skill 系统、核心运转机制（→ manual）、技术栈（→ architecture.md）
   - CLI 速查：单行命令示例，完整参考在 manual

2. **docs/manual/ 结构：6 文件**
   - 01-intro.md：保持不变
   - 02-concepts.md：合并术语词典
   - 03-lifecycle.md：完整生命周期 + Mermaid
   - 04-cli-ref.md：原 03-cli.md 重命名
   - 05-arsenal.md：确认内容有效性
   - 06-troubleshooting.md：确认内容有效性
   - （无 04-architecture.md，architecture.md 是单一权威）

3. **新增 07-dev.md**
   - 从源码构建指南
   - 开发环境说明
   - 贡献流程

4. **删除 Skill 系统文档**
   - Skill 是给 AI 的指令，AI 直接读 src/skills/*.ts
   - 人类无需阅读 Skill 实现细节

## Risks / Trade-offs

- **风险**：manual 中部分命令可能已过时
  - 应对：实施前验证现有命令有效性
- **权衡**：删除 Skill 文档可能影响人类理解系统能力
  - 决策：Skill 面向 AI，文档价值有限；若需了解，阅读源码