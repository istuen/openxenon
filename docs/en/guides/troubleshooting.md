# 5. Troubleshooting

## Common Issues

### Q1: `oxn init` fails

**Symptom**:

```
Error: Permission denied: /home/user/.openxenon
```

**Cause**: Current user doesn't have write permission to `.openxenon` directory.

**Solution**:

```bash
# Check directory permissions
ls -la ~/.openxenon

# If permission issue exists, try to fix
sudo chown -R $(whoami) ~/.openxenon
```

---

### Q2: `oxn task submit` fails

**Symptom**:

```
Error: Blueprint not found for task: my-task
Please submit Blueprint first using `oxn task submit --blueprint <file>`.
```

**Cause**: Task hasn't been created or Blueprint file doesn't exist.

**Solution**:

1. Confirm task directory exists:

```bash
ls -la .openxenon/tasks/my-task/
```

2. Confirm Blueprint file exists:

```bash
cat .openxenon/tasks/my-task/blueprint.yaml
```

3. If file doesn't exist, recreate the task

---

### Q3: Probe verification fails

**Symptom**:

```
[OXN] Probe failed: fs_exists
Path: dist/index.js
Expected: file exists
Actual: file not found
```

**Cause**: File or directory doesn't exist.

**Solution**:

1. Check if file path is correct
2. Confirm build step executed successfully
3. If temporary file, consider adjusting Probe check timing

---

### Q4: Stage execution order is wrong

**Symptom**:

```
[OXN] Stage 'Test' executed before 'Build'
```

**Cause**: Order of `stages.selected` in Blueprint is incorrect.

**Solution**:

Edit `.openxenon/tasks/<task-id>/blueprint.yaml`:

```yaml
stages:
  selected:
    - Build    # Ensure Build is before Test
    - Test
```

---

### Q5: DRAFT asset cannot promote

**Symptom**:

```
Error: Asset is not in DRAFT state
```

**Cause**: Asset being promoted is already in CANONICAL state.

**Solution**:

- Use `oxn arsenal list` to confirm asset's current state
- Only assets under DRAFT directory can be promoted

---

### Q6: Daemon not responding

**Symptom**:

```
[OXN] Daemon is not responding
```

**Solution**:

```bash
# Restart daemon
oxn daemon stop
oxn daemon start

# Check daemon status
oxn daemon status
```

---

### Q7: `oxn arsenal promote` has no effect

**Symptom**:

```
Asset promoted successfully! (But asset still in DRAFT directory)
```

**Cause**: `oxn arsenal promote` moves files, not copies.

**Solution**:

1. Confirm asset has been moved to CANONICAL directory:

```bash
ls -la .openxenon/arsenals/stages/CANONICAL/
```

2. If original file still exists, check for permission issues

---

## Best Practices

### 1. Submit immediately after task creation

```bash
# Submit Blueprint to create task
oxn task submit --blueprint <blueprint-file>
```

### 2. Use absolute paths

Use absolute paths in Blueprint to avoid relative path ambiguity:

```yaml
params:
  path: /absolute/path/to/file.txt
```

### 3. Probe over complex commands

Prefer atomic Probes over complex multi-step commands:

```yaml
# Recommended
probes:
  - ref: fs_exists
    params:
      pattern: dist/index.js

# Not recommended
probes:
  - ref: shell_exec
    params:
      command: test -f dist/index.js && echo "exists"
```

### 4. Promptly promote Draft assets

Draft assets won't be referenced by other tasks, promote promptly after review:

```bash
# Review
oxn arsenal inspect stages/my-stage

# Promote
oxn arsenal promote stages/my-stage
```

### 5. Keep Blueprint concise

Blueprint should be "engineering drawing" not "execution log":

```yaml
# Recommended: Concise Blueprint
name: Build Project
stages:
  - id: build
    name: Build
    target:
      description: "Build the project"
    action:
      description: "Run npm run build"
    probes:
      - ref: shell_exec
        params:
          command: npm run build

# Not recommended: Contains too much detail
name: |
  This is a complex build task...
  Steps as follows: 1. Install dependencies 2. Run lint 3. Run tests...
```

### 6. Regularly clean up Draft assets

If Draft assets are left unprocessed for a long time, they may be outdated:

```bash
# View Draft assets
oxn arsenal list DRAFT

# Clean up unwanted Drafts
rm .openxenon/arsenals/*/DRAFT/old-asset.yaml
```

---

## Performance Optimization

### Avoid excessive nested Stages

Each Stage should have a clear purpose, don't over-split.

### Reuse existing Probes

When creating new Stage, prioritize reusing existing Probes:

```yaml
# Reuse
probes:
  - ref: fs_exists      # Already exists
  - ref: fs_match        # New requirement
```

### Set reasonable timeout

For time-consuming commands, set reasonable timeout:

```yaml
probes:
  - ref: shell_exec
    params:
      command: npm test
      timeout: 30000  # 30 seconds
```

---

## Security Recommendations

### Use force-pass with caution

`force-pass` bypasses all verification, use only in extreme cases:

```bash
# Warning: Extremely dangerous
oxn force-pass <step-id>
```

### Review all Draft assets

Before promoting, review asset content to prevent malicious code:

```bash
oxn arsenal inspect <asset-path>
```

### Limit Daemon permissions

Ensure Daemon runs in controlled environment, don't give excessive permissions.

---

## Getting Help

If you encounter issues not covered in this document:

1. View Daemon log: `~/.openxenon/daemon.log`
2. Use `--verbose` option for detailed output
3. Submit Issue to project repository