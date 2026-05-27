## ADDED Requirements

### Requirement: XnTask

The system SHALL define `XnTask` interface that extends existing Task:
- `id`: Unique task identifier
- `name`: Task name
- `xnBlueprint`: Associated XnBlueprint
- `xnTaskStatus`: Task status (pending/running/completed/failed)
- `xnAction`: Optional execution actions for LLM
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

### Requirement: XnBlueprint

The system SHALL define `XnBlueprint` interface that wraps existing Playbook:
- `id`: Blueprint identifier
- `xnTaskId`: Associated task ID
- `xnStages`: Array of XnStage
- `status`: Blueprint status (canonical/drafting/executing/pending_review/promoted/rejected)

### Requirement: XnStage

The system SHALL define `XnStage` interface that extends existing Step:
- `id`: Stage identifier
- `name`: Stage name
- `xnSpec`: Execution constraints (constraints + forbiddenPatterns)
- `xnProof`: XnProof identifier
- `xnAction`: Optional execution actions for LLM
- `xnStageStatus`: Stage status (pending/running/passed/failed)
- `targetState`: Target state description

### Requirement: XnSpec

The system SHALL define `XnSpec` interface:
- `constraints`: Array of constraint strings
- `forbiddenPatterns`: Array of forbidden regex patterns
- `description`: Optional description

### Requirement: XnProof

The system SHALL define `XnProof` interface that extends existing Proof:
- `id`: Proof identifier
- `name`: Proof name
- `type`: Proof type (validation/lint/test)
- `path`: Proof script path
- `layer`: Proof layer (L1/L2/L3/L4)
- `description`: Proof description

### Requirement: XnAction

The system SHALL define `XnAction` interface:
- `instructions`: Array of instruction strings (e.g., "使用 TypeScript", "先写测试再写实现")
- `priority`: Action priority (optional)

### Requirement: XnSample

The system SHALL define `XnSample` interface:
- `id`: Sample identifier
- `xnStageId`: Original stage ID
- `payload`: Sample code/explanation
- `status`: Sample status (pending/approved/rejected)

### Requirement: XnStageStatus

The system SHALL define stage status types:
- `pending`: Stage not yet executed
- `running`: Stage currently executing
- `passed`: Stage passed verification
- `failed`: Stage failed verification

### Requirement: XnTaskStatus

The system SHALL define task status types:
- `pending`: Task not yet started
- `running`: Task in progress
- `completed`: All stages passed
- `failed`: One or more stages failed