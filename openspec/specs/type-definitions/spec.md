## ADDED Requirements

### Requirement: Playbook type interface

The system SHALL define a TypeScript interface `Playbook` with fields:
- `task`: string - Task name
- `steps`: Step[] - Array of step objects

#### Scenario: Validate Playbook structure
- **WHEN** AI submits a Playbook
- **THEN** TypeScript compiler validates structure matches interface

#### Scenario: Serialize Playbook to JSON
- **WHEN** Core stores Playbook in database
- **THEN** system serializes interface to JSON string

### Requirement: Step type interface

The system SHALL define a TypeScript interface `Step` with fields:
- `id`: string - Step identifier
- `name`: string - Step name
- `spec`: string - Execution specification
- `proof`: string - Proof identifier

#### Scenario: Create Step instance
- **WHEN** AI creates a step object
- **THEN** object must conform to Step interface

#### Scenario: Access step properties
- **WHEN** Core processes a step
- **THEN** TypeScript provides type-safe property access

### Requirement: Task type interface

The system SHALL define a TypeScript interface `Task` with fields:
- `id`: string - Task UUID
- `name`: string - Task name
- `playbook`: Playbook - Playbook object
- `status`: TaskStatus - Task status
- `createdAt`: number - Creation timestamp
- `updatedAt`: number - Update timestamp

#### Scenario: Map database row to Task
- **WHEN** Core reads task from database
- **THEN** system maps row to Task interface

### Requirement: TaskStatus type

The system SHALL define a TypeScript union type `TaskStatus` with values:
- `'pending'`: Task not started
- `'running'`: Task executing
- `'completed'`: Task finished successfully
- `'failed'`: Task failed

#### Scenario: Assign TaskStatus value
- **WHEN** system updates task status
- **THEN** only valid enum values accepted

#### Scenario: Compile-time status validation
- **WHEN** developer assigns invalid status string
- **THEN** TypeScript compiler reports error

### Requirement: StepStatus type

The system SHALL define a TypeScript union type `StepStatus` with values:
- `'pending'`: Step not started
- `'running'`: Step executing
- `'passed'`: Step verified successfully
- `'failed'`: Step verification failed

#### Scenario: Assign StepStatus value
- **WHEN** system updates step status
- **THEN** only valid enum values accepted

### Requirement: StepManifest type interface

The system SHALL define a TypeScript interface `StepManifest` with fields:
- `taskId`: string - Task identifier
- `stepId`: string - Current step identifier
- `status`: StepStatus - Step status
- `artifacts`: Artifact[] - Generated artifacts
- `timestamp`: number - Manifest timestamp

#### Scenario: AI writes manifest to JSON
- **WHEN** AI completes a step
- **THEN** AI serializes StepManifest to `step-manifest.json`

#### Scenario: Core parses manifest from JSON
- **WHEN** Core reads `step-manifest.json`
- **THEN** Core deserializes JSON to StepManifest interface

### Requirement: Artifact type interface

The system SHALL define a TypeScript interface `Artifact` with fields:
- `path`: string - File path
- `type`: ArtifactType - Artifact type
- `hash`: string - File hash

#### Scenario: Record generated artifact
- **WHEN** AI generates a code file
- **THEN** system creates Artifact record with path, type, and hash

### Requirement: ArtifactType type

The system SHALL define a TypeScript union type `ArtifactType` with values:
- `'code'`: Source code file
- `'config'`: Configuration file
- `'document'`: Documentation file
- `'test'`: Test file

#### Scenario: Categorize artifact by type
- **WHEN** AI generates a file
- **THEN** system assigns appropriate ArtifactType

### Requirement: Proof type interface

The system SHALL define a TypeScript interface `Proof` with fields:
- `id`: string - Proof identifier
- `name`: string - Proof name
- `type`: ProofType - Proof type
- `path`: string - Script path

#### Scenario: Load proof metadata
- **WHEN** Core scans proof scripts
- **THEN** system creates Proof objects for each script

### Requirement: ProofType type

The system SHALL define a TypeScript union type `ProofType` with values:
- `'validation'`: Validation type
- `'lint'`: Code linting type
- `'test'`: Testing type

#### Scenario: Categorize proof by type
- **WHEN** proof script is added
- **THEN** system assigns appropriate ProofType

### Requirement: Project type interface

The system SHALL define a TypeScript interface `Project` with fields:
- `id`: string - Project UUID
- `path`: string - Project absolute path
- `name`: string - Project name
- `status`: 'active' | 'archived' - Project status
- `lastHeartbeat`: number - Last heartbeat timestamp
- `createdAt`: number - Creation timestamp
- `updatedAt`: number - Update timestamp

#### Scenario: Map database row to Project
- **WHEN** Core reads project from core.db
- **THEN** system maps row to Project interface

#### Scenario: Register new project
- **WHEN** user runs `xn init`
- **THEN** system creates Project object and stores in database

### Requirement: Type strictness

The system SHALL use TypeScript strict mode for all type definitions.

#### Scenario: Enable strict mode
- **WHEN** TypeScript compiles code
- **THEN** strict mode ensures no implicit any, null checks, etc.

#### Scenario: End-to-end type safety
- **WHEN** data flows from AI to Core
- **THEN** TypeScript validates types at both ends
