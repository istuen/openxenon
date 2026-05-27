## ADDED Requirements

### Requirement: Meta Blueprint for Probe

元蓝图必须定义生成 Probe 时的约束：
- type: 探针类型 (fs_exists, shell_exec, etc)
- pattern/command: 探针参数

### Requirement: Meta Blueprint for Proof

元蓝图必须定义生成 Proof 时的约束：
- target: 验证目标描述
- spec: 验证规范描述
- probes: 探针列表

### Requirement: Meta Blueprint for Stage

元蓝图必须定义生成 Stage 时的约束：
- id, name: 标识信息
- proof: 验证闭环
- deps: 依赖数组

### Requirement: Meta Blueprint for Blueprint

元蓝图必须定义生成 Blueprint 时的约束：
- id, name: 标识信息
- stages: 工序数组，每个包含 id, name, proof, deps