## MODIFIED Requirements

### Requirement: Task type interface

The system SHALL define a TypeScript interface `Task` with fields:
- `id: string`: Task UUID
- `name: string`: Task name
- `status: TaskStatus`: Task status (PENDING/RUNNING/COMPLETED/ESCAPED/TERMINATED)
- `activeBlueprintId?: string`: Active Blueprint ID reference
- `createdAt: number`: Creation timestamp
- `updatedAt: number`: Update timestamp

#### Scenario: Create Task instance
- **WHEN** User submits a new task
- **THEN** system creates Task object with auto-generated UUID

#### Scenario: Map database row to Task
- **WHEN** Core reads task from database
- **THEN** system maps row to Task interface with activeBlueprintId reference

### Requirement: Blueprint type interface

The system SHALL define a TypeScript interface `Blueprint` with fields:
- `id: string`: Blueprint UUID
- `taskId: string`: Parent Task ID
- `name: string`: Blueprint name
- `status: BlueprintStatus`: Blueprint status (DRAFT/CANONICAL/SAMPLE/ABANDONED)
- `createdAt: number`: Creation timestamp

#### Scenario: Create Blueprint instance
- **WHEN** AI creates a Blueprint for a Task
- **THEN** system creates Blueprint object with auto-generated UUID

### Requirement: BlueprintStatus type

The system SHALL define a TypeScript union type `BlueprintStatus` with values:
- `'DRAFT'`: Blueprint is being drafted/evolved
- `'CANONICAL'`: Blueprint is the active/executing one
- `'SAMPLE'`: Blueprint is an exploratory deviation
- `'ABANDONED'`: Blueprint has been rejected/discarded

#### Scenario: Blueprint status transition
- **WHEN** system promotes a Blueprint to CANONICAL
- **THEN** BlueprintStatus changes from DRAFT to CANONICAL

### Requirement: Stage type interface

The system SHALL define a TypeScript interface `Stage` with fields:
- `id: string`: Stage UUID
- `blueprintId: string`: Parent Blueprint ID
- `name: string`: Stage name
- `deps: string[]`: Array of Stage IDs this stage depends on
- `target: string`: Target state description
- `spec: string`: Execution spec boundary
- `action?: string`: Action hint
- `proof: string | string[]`: Proof name or array of proof names
- `status: StageStatus`: Stage status (PENDING/RUNNING/PASSED/FAILED)
- `createdAt: number`: Creation timestamp
- `completedAt?: number`: Completion timestamp

#### Scenario: Create Stage instance
- **WHEN** AI creates a Stage for a Blueprint
- **THEN** system creates Stage object with auto-generated UUID

#### Scenario: Immutable modification
- **WHEN** AI needs to modify a Stage's proof
- **THEN** system creates new Stage instance (not mutate existing)

### Requirement: StageStatus type

The system SHALL define a TypeScript union type `StageStatus` with values:
- `'PENDING'`: Stage not started
- `'RUNNING'`: Stage executing
- `'PASSED'`: Stage verified successfully
- `'FAILED'`: Stage verification failed

#### Scenario: Stage status transition
- **WHEN** Core verifies a Stage with Proof
- **THEN** StageStatus changes to PASSED or FAILED
