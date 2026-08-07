# Stack Operation 作为执行参照系

把 `bun test` / `bun build` 等确定性命令从 Blueprint slot 的 observe（验证参照）分离为 operate（执行参照），让 AI Agent 在 Task 内零推理拿到应运行的命令。Operation 是 Stack Tool 的命名调用声明，住进 `## Tools` 段的 `operations` 子段；Blueprint slot 通过 `operate: [op-name...]` 数组引用。设计上 operate 与 observe 正交独立（前者是 AI Agent 的执行参照，后者是 OXN 的验证门禁），实践中常成对出现。该决策承担了"OXN 是确定性参照系"（ADR-0072）六个参照锚点之一"CLI 调用参照动作"的落地职责。