## 1. TypeScript Type Definitions

- [x] 1.1 Create `src/types/core.ts` with base types (TaskStatus, StepStatus, ArtifactType, ProofType)
- [x] 1.2 Create `src/types/playbook.ts` with Playbook and Step interfaces
- [x] 1.3 Create `src/types/task.ts` with Task and StepManifest interfaces
- [x] 1.4 Create `src/types/artifact.ts` with Artifact interface
- [x] 1.5 Create `src/types/proof.ts` with Proof interface
- [x] 1.6 Create `src/types/project.ts` with Project interface
- [x] 1.7 Create `src/types/index.ts` to export all types

## 2. Database Schema

- [x] 2.1 Create `src/db/schema/core.ts` with projects table SQL schema
- [x] 2.2 Create `src/db/schema/project.ts` with tasks, steps, escape_logs, proof_logs tables SQL schemas
- [x] 2.3 Create `src/db/schema/indexes.ts` with index creation SQL
- [x] 2.4 Create `src/db/migrations/` directory structure for future migrations
- [x] 2.5 Create `src/db/init.ts` with database initialization logic

## 3. Global Structure Implementation

- [x] 3.1 Create `src/core/global.ts` with global boundary path constants
- [x] 3.2 Implement `ensureGlobalBoundary()` function to create `~/.xenonix/` structure
- [x] 3.3 Implement `initCoreDb()` function to create and initialize `core.db`
- [x] 3.4 Implement `registerProject()` function to insert project record into `core.db`
- [x] 3.5 Create `src/core/proofs.ts` with global proof scanning logic
- [x] 3.6 Implement `scanGlobalProofs()` function to discover proofs in `~/.xenonix/proofs/`

## 4. Project Structure Implementation

- [x] 4.1 Create `src/core/project.ts` with project boundary path utilities
- [x] 4.2 Implement `ensureProjectBoundary()` function to create `<project>/.xenonix/` structure
- [x] 4.3 Implement `initProjectDb()` function to create `project.db` with WAL mode
- [x] 4.4 Implement `createTaskDirectory()` function to create task directory structure
- [x] 4.5 Create `src/core/manifest.ts` with step-manifest.json utilities
- [x] 4.6 Implement `scanProjectProofs()` function with project-first priority

## 5. Database Operations

- [x] 5.1 Create `src/db/operations/projects.ts` with CRUD operations for projects table
- [x] 5.2 Create `src/db/operations/tasks.ts` with CRUD operations for tasks table
- [x] 5.3 Create `src/db/operations/steps.ts` with CRUD operations for steps table
- [x] 5.4 Create `src/db/operations/escape-logs.ts` with insert and query operations
- [x] 5.5 Create `src/db/operations/proof-logs.ts` with insert and query operations

## 6. File Watcher Implementation

- [x] 6.1 Create `src/watcher/manifest-watcher.ts` with ManifestWatcher class
- [x] 6.2 Implement `watch()` method to monitor step-manifest.json changes
- [x] 6.3 Implement `handleManifestChange()` to sync snapshots to project.db
- [x] 6.4 Implement `detectEscape()` method for timeout-based escape detection
- [x] 6.5 Create `src/watcher/index.ts` to export watcher utilities

## 7. Verification System

- [x] 7.1 Create `src/verification/dual-track.ts` with dual-track verification logic
- [x] 7.2 Implement `verifyStep()` for active verification (明线)
- [x] 7.3 Implement `startEscapeMonitor()` for passive monitoring (暗线)
- [x] 7.4 Create `src/verification/proof-executor.ts` with proof execution logic
- [x] 7.5 Implement `executeProof()` to run proof scripts using Bun.spawn

## 8. Testing

- [x] 8.1 Create `tests/types/` with type definition unit tests
- [x] 8.2 Create `tests/db/` with database schema and operations tests
- [x] 8.3 Create `tests/core/` with global and project structure tests
- [x] 8.4 Create `tests/watcher/` with file watcher tests
- [x] 8.5 Create `tests/verification/` with dual-track verification tests

## 9. Documentation

- [x] 9.1 Update README.md with architecture diagram references
- [x] 9.2 Create `docs/architecture.md` with detailed architecture explanation
- [x] 9.3 Create `docs/database.md` with database schema documentation
- [x] 9.4 Create `docs/types.md` with TypeScript interface documentation
