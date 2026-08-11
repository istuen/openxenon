---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# Stack Operation 后续落地（P2 多 Stack ref + P3 OXL transformer + P4 Skill 联动）

RFC-0024 落地后收敛 3 项后续工作：P1 work-validator operate 校验（已合并进 RFC-0024，避免半截工程）、P2 Blueprint 多 Stack ref 支持 + git-stack 拆分（拆出 git/gh 命令脱离 oxn-stack，污染实现边界解除）、P3 Stack OXL transformer 升级（regex → mdast，与 Domain/Workflow/Blueprint 对称，支持 multiline desc 与 operations 嵌套结构）、P4 /oxn-work Skill instruction 联动（教 AI 看到 operate → 跨层查 Stack tool.operations → 取 command 执行，含 operate vs observe 语义区别说明避免误判）。关键 trade-off：P3 优先级上调与 P1 同期而非 P2 之后（P1 校验路径读取 operation 元数据，regex 截断会污染校验输入）；D2.4 决策 git-stack 不进 5 起手 Asset（按需引用而非默认必有）。