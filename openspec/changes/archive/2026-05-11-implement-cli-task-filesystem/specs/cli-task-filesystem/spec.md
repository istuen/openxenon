## ADDED Requirements

### Requirement: CLI task submit creates task directory with blueprint and state

CLI SHALL read the Blueprint YAML file from the path provided via `oxn task submit --blueprint <path>`, validate its basic structure, generate a unique task-id, and create the task directory at `.openxenon/tasks/<task-id>/`.

#### Scenario: Successful submit creates required files
- **WHEN** user runs `oxn task submit --blueprint .openxenon/arsenal/tasks/my-task.yaml`
- **THEN** CLI creates `.openxenon/tasks/<task-id>/` directory
- **AND** CLI writes the original Blueprint YAML to `blueprint.yaml`
- **AND** CLI writes initial `state.json` with status "PENDING" and empty stages map
- **AND** CLI outputs the generated task-id to stdout

#### Scenario: Submit with non-existent blueprint file fails
- **WHEN** user runs `oxn task submit --blueprint nonexistent.yaml`
- **THEN** CLI exits with error code 1
- **AND** CLI outputs error message indicating file not found

### Requirement: CLI task next advances stage state

CLI SHALL read the task's `state.json`, find the first PENDING stage from the Blueprint's stage list (respecting deps order), update its state to RUNNING, and write the updated state back.

#### Scenario: Next returns next pending stage
- **WHEN** user runs `oxn task next --task-id <id>` for a task with stages in PENDING state
- **THEN** CLI reads `blueprint.yaml` and `state.json`
- **AND** CLI finds first stage where `state.stages[stage.name] === 'PENDING'` or undefined
- **AND** CLI updates that stage to RUNNING and sets `currentStage`
- **AND** CLI writes updated state to `state.json`
- **AND** CLI outputs the stage name and its proof definition

#### Scenario: Next returns COMPLETED when all stages done
- **WHEN** user runs `oxn task next --task-id <id>` and all stages are PASSED or FAILED
- **THEN** CLI sets task status to COMPLETED
- **AND** CLI writes updated state to `state.json`
- **AND** CLI outputs `{ status: 'COMPLETED' }`

### Requirement: CLI task verify executes probes and updates state

CLI SHALL read the task's Blueprint and state, find the specified stage's proof, execute each probe via Infra, evaluate results via Kernel, append to `trace.yaml`, and update `state.json`.

#### Scenario: Verify all probes pass updates stage to PASSED
- **WHEN** user runs `oxn task verify --task-id <id> --stage-id <stage-name>`
- **AND** all probes in the stage's proof execution return passed
- **THEN** CLI updates `state.stages[<stage-name>] = 'PASSED'`
- **AND** CLI appends probe results to `trace.yaml`
- **AND** CLI writes updated state to `state.json`

#### Scenario: Verify any probe fails updates stage to FAILED
- **WHEN** user runs `oxn task verify --task-id <id> --stage-id <stage-name>`
- **AND** any probe in the stage's proof execution returns not passed
- **THEN** CLI updates `state.stages[<stage-name>] = 'FAILED'`
- **AND** CLI appends probe results to `trace.yaml`
- **AND** CLI writes updated state to `state.json`

### Requirement: CLI task status returns current state

CLI SHALL read the task's `state.json` and `step-manifest.json` (if exists) and output the current task and stage statuses.

#### Scenario: Status returns aggregated state
- **WHEN** user runs `oxn task status --task-id <id>`
- **THEN** CLI reads `state.json`
- **AND** CLI outputs task status, currentStage, and per-stage statuses

### Requirement: Probe execution via Infra layer

CLI SHALL execute probes using Infra probe implementations (fs_exists, fs_content_match, exec_exit_zero) and evaluate results using Kernel pure functions.

#### Scenario: fs_exists probe executes correctly
- **WHEN** probe type is `fs_exists` with params `{ path: "src/index.ts" }`
- **AND** the file exists in project root
- **THEN** Infra returns `["/absolute/path/to/src/index.ts"]`
- **AND** Kernel evaluates `found.length > 0` as PASSED

#### Scenario: exec_exit_zero probe executes correctly
- **WHEN** probe type is `exec_exit_zero` with params `{ command: "pnpm test" }`
- **AND** the command exits with code 0
- **THEN** Infra returns `{ success: true, exitCode: 0 }`
- **AND** Kernel evaluates `exitCode === 0` as PASSED

### Requirement: trace.yaml append-only audit log

CLI SHALL append probe execution events to `trace.yaml` in the task directory. Each entry contains timestamp, event type, probe details, and result.

#### Scenario: trace.yaml receives appended entries
- **WHEN** probe executes during verify
- **THEN** CLI appends JSON lines to `trace.yaml`:
  ```json
  {"timestamp":"ISO8601","event":"probe-executed","probe":{"type":"...","params":{...}},"result":"PASSED","duration":123}
  ```

### Requirement: step-manifest.json records step-level state

CLI SHALL write step-manifest.json during verify, recording each step's status, artifacts, and probe results.

#### Scenario: step-manifest.json written after verify
- **WHEN** verify completes for a stage
- **THEN** CLI writes `step-manifest.json` with stage status and probe results
- **AND** subsequent `oxn task status` reads and includes this data