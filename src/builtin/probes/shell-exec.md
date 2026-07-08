---
entity: probe
version: 0.1.0
name: shell_exec
---

# Probe: shell_exec

> 执行 shell 命令并返回结果

## Alignment

- align: ShellExec

## Scheme

- scheme: shell://

## Props

### command
- type: string
- required: true

## Output

- exit_code: number
- stdout: string
- stderr: string
