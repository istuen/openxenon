---
entity: domain
version: 0.3.0
name: SecurityContext
---

# Domain: SecurityContext

> 源代码侧的安全防护限界上下文：ReDoS 防护、Shell 注入拦截、路径穿越防御、资源超时保护

## Terms

### ReDoS
- name: ReDoS
- desc: 正则表达式拒绝服务：恶意模式如 (a+)+b 在长输入下指数级回溯，进程挂死

### ShellInjection
- name: ShellInjection
- desc: Shell 元字符未转义导致命令拼接: ; | & $() ` 等被攻击者利用

### PathTraversal
- name: PathTraversal
- desc: 用户传入路径含 ../ 逃逸沙盒边界，写入或读取非授权目录

### SafeRegex
- name: SafeRegex
- desc: safe-regex 库提供的复杂度上限校验：max safe length < 输入长度 即拒

### ArgvArray
- name: ArgvArray
- desc: spawn(cmd, [arg1, arg2]) 形式：参数作为 argv 数组传递，不经 shell 解析

### Boundary
- name: Boundary
- desc: 沙盒根目录绝对路径，所有用户路径必须 resolve 后在 boundary 之内

### Timeout
- name: Timeout
- desc: 外部命令最大执行毫秒数，超时由 setTimeout + kill 实现

### ShellEscape
- name: ShellEscape
- desc: 对必须 shell 调用的场景，参数中 ; | & $() ` 替换为转义形式

## Bans

### forbidden-constructs
- items: shell: true, child_process.exec
- desc: shell: true, child_process.exec

## Invariants

### inv-1
- value: 用户输入的 regex 模式必须先经 safe-regex 校验（max safe length < 10^5）
- desc: 用户输入的 regex 模式必须先经 safe-regex 校验（max safe length < 10^5）

### inv-2
- value: spawn 调用必须传 argv 数组，禁止 shell:true 形式（避免元字符被 shell 解析）
- desc: spawn 调用必须传 argv 数组，禁止 shell:true 形式（避免元字符被 shell 解析）

### inv-3
- value: 所有用户 filePath 必须经 path.resolve + boundary.startsWith 检查
- desc: 所有用户 filePath 必须经 path.resolve + boundary.startsWith 检查

### inv-4
- value: 外部命令（shell-exec / process.exec）必须有 timeout，默认 30 秒
- desc: 外部命令（shell-exec / process.exec）必须有 timeout，默认 30 秒

### inv-5
- value: 正则匹配必须有 timeout 或次数上限（避免 O(2^n) 回溯）
- desc: 正则匹配必须有 timeout 或次数上限（避免 O(2^n) 回溯）

### inv-6
- value: socket 监听必须有 max connection 上限 + 读超时
- desc: socket 监听必须有 max connection 上限 + 读超时
