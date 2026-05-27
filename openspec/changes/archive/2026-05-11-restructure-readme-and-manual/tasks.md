## 1. 备份与准备

- [x] 1.1 备份当前 README.md
- [x] 1.2 检查 docs/manual/ 现有内容
- [x] 1.3 验证现有 CLI 命令有效性（oxn --help, oxn task --help 等）

## 2. 重建 docs/manual/ 结构

- [x] 2.1 清空并重建 02-concepts.md（合并术语词典）
- [x] 2.2 清空并重建 03-lifecycle.md（生命周期 + Mermaid）
- [x] 2.3 重命名 03-cli.md → 04-cli-ref.md
- [x] 2.4 确认 05-arsenal.md 内容有效性
- [x] 2.5 确认 06-troubleshooting.md 内容有效性
- [x] 2.6 新建 07-dev.md（从源码构建）
- [x] 2.7 更新 docs/manual/README.md 导航

## 3. 重写 README.md

- [x] 3.1 编写 README.md（目标 < 150 行）
  - 一句话简介
  - 快速开始（3-5 步）
  - CLI 速查
  - 文档导航（指向 manual + architecture）
  - 从源码构建
- [x] 3.2 删除 Skill 系统描述（从 README）
- [x] 3.3 删除核心运转机制详细说明（→ manual）
- [x] 3.4 删除 Mermaid 流程图（→ manual）

## 4. 验证

- [x] 4.1 验证 README.md 行数 < 150 (77行)
- [x] 4.2 验证 docs/manual/ 有 7 个 .md 文件（01-07）
- [x] 4.3 验证 docs/manual/ 无 04-architecture.md
- [x] 4.4 验证文档引用关系正确