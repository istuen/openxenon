# Changelog

All notable changes to this project will be documented in this file.

## [0.0.27] - 2026-05-24

### Added
- oxn-validate CLI command
- OXN DSL example files (blueprint/part/probe/work)
- Work type shorthand syntax
- Part refs in slotBindings inject probes into frozen Blueprint

### Fixed
- Use correct blueprint ref path @prj/blueprints/<name>
- Use correct OXN DSL syntax for task.oxn
- resolvedFrom should be 'project'

## [0.0.26] - 2026-05-23

### Added
- i18n Phase A — multi-language base and Skill content internationalization
- OxnKernelAdapter migrated to oxn-dsl layer
- explore scan index mode

### Fixed
- Update skills source files to OXN DSL v3.1 syntax
- Remove legacy forges and probes YAML files
- All typecheck + test pass

## [0.0.25] - 2026-05-22

### Added
- OXN DSL Slot paradigm refactor — abolish Interface/AbstractPart, establish slot mechanism

### Fixed
- Resolve 32 lint violations per architecture constitution
- Resolve typecheck errors in production code

## [0.0.24] - 2026-05-21

### Added
- YAML purge — paths .oxn, kill 6 parseYAML sources
- Forge-Arsenal pipeline — publish rename, compile diagnostics, OXN scaffold, dir migration
- E2E param flow — prove explicit parameter mapping closed loop
- Langium services + DocumentBuilder + pipeline integration

## [0.0.23] - 2026-05-20

### Added
- OXN DSL core architecture v1.1~v1.6: Langium grammar, AST-to-IR, Scope Provider, OxnAssemblyIR schema, Kernel adapter, Param evaluator
- CLI subcommands: compile/unpack/promote/migrate-yaml
- Phase 2~4 complete: asset loader, flattener, bundle compiler, unpacker, builtin OXN, sandbox, mutation validator, promote
- Interface/rule/expectation validators, migration, deprecation

### Fixed
- Escape backticks in oxn-task instruction string

## [0.0.22] - 2026-05-19

### Added
- Compilation and cache mechanism — compiled artifacts, _depHash, assembly, manifest
- Unified props/params naming + parameter injection chain

### Fixed
- Code aligns with architecture documentation

## [0.0.21] - 2026-05-18

### Added
- Stage→Part refactor across codebase
- YAML parsing and slot support
- Docs structure reorganization (en/zh-cn)
- Architecture report P0 improvements: Stage→Part merge, Probe single-file storage, BUILTIN_PARTS population, min_version validation, Forge unpack/repack

### Removed
- Remove proof concept from docs and code

## [0.0.20] - 2026-05-17

### Added
- Hall dashboard with Arsenal/Forge asset display and detail view
- Task explore and state management commands
- Incremental compilation with compile cache
- Daemon runtime monitoring, process management, and SSE events

### Changed
- Support directory scan in explore scan

### Fixed
- Resolve all typecheck errors

## [0.0.19] - 2026-05-16

### Added
- Hall (研讨厅) dashboard
- Forge/Arsenal physical separation
- Harvest and probe verdict display

### Changed
- Unify blueprint/arsenal/forge file structure
- Complete rewrite - new interaction topology, four core concepts, revised doc structure

### Fixed
- Add blueprint support to forge --save command
- Make Hall project-scoped instead of global
- Correct Hall documentation placement in README
- Correct oxn-trace skill to use 'oxn export' instead of non-existent 'oxn api'

## [0.0.18] - 2026-05-15

### Added
- F3 AI execution loop - privacy isolation
- HTML renderer for task-trace reports and Blueprint DAG preview

### Changed
- Remove proof concept, flatten stage structure
- Merge proof into stage, unify probe/definition invocation schema
- Uniformize all commands with centralized output module

### Removed
- Deprecated CLI commands (draft, force-pass, rollback, inspect, trace, api, proof-list)

## [0.0.17] - 2026-05-14

### Added
- Stage/Probe namespace and Blueprint v1 architecture
- Skill references support to skill-compiler
- Exploration mechanism - markdown reports for coverage, quality, automation

### Changed
- Optimize code performance and reduce duplication

### Fixed
- DAG-based stage ordering in taskNext
- Unify probe type naming across Schema and Skill references
- Use kebab-case name as Task ID instead of random UUID

## [0.0.16] - 2026-05-13

### Added
- Arsenal registry and search with semantic annotations
- ProbeDefinitionSchema
- Constitution eslint rules

### Changed
- Migrate to kernel/infra/arsenals FP architecture
- Consolidate api and cli
- Simplify physical architecture to zero-database
- Internalize meta-forge constraints to YAML files

### Fixed
- Resolve high and medium severity vulnerabilities

## [0.0.15] - 2026-05-12

### Added
- Kernel lambda vacuum refactoring
- Daemon IPC with receiver.ts and handlers/
- CLI handlers use socket-client instead of importing daemon modules

### Changed
- Connect daemon executor to kernel evaluator
- Physics constitutional enforcement

### Removed
- Dead kernel/probes/executor.ts (violated Lambda Vacuum)

## [0.0.14] - 2026-05-11

### Added
- Arsenal list showing stages with type/source filtering
- Built-in assets fallback, Skills reference daemon

### Changed
- Update README and architecture.md to 0.1 exploration mode
- Remove academic framing, use plain engineering language

### Fixed
- Support YAML format in oxn forge probe -s
- Support <type>/<name> format in oxn arsenal inspect
- Accept both params.path and params.pattern for fs_exists/fs_not_exists probes

## [0.0.13] - 2026-05-10

### Added
- Implement arsenal registry and search
- Implement arsenal registry and search with semantic annotations
- Skill-compiler outputs to <skillId>/SKILL.md

### Changed
- Purify Skills
- Fix Forge/Task loops

### Fixed
- Skill-compiler uses name: instead of skill: in SKILL.md frontmatter

## [0.0.12] - 2026-05-09

### Added
- Layer 1 Kernel Schema tests
- File-based config and pure-filesystem-state specs

### Changed
- Remove database references from core modules
- Update handlers to use append-only task-trace and atomic manifest
- Update runtimes, server, skills for filesystem-only architecture

### Fixed
- Align code and docs with current Schema
- ProofInvocationSchema.probeRefs now accepts ProbeInvocation[]

## [0.0.11] - 2026-05-08

### Added
- CLI task commands with direct filesystem operations

### Changed
- Restructure README and manual for clarity

### Fixed
- StageDefinitionSchema add description
- ProofDefinitionSchema.probes structured
- ParameterDefSchema.description required

## [0.0.10] - 2026-05-07

### Added
- MIT license

### Changed
- Remove proof concept, merge validation into stage flat fields

## [0.0.9] - 2026-05-06

### Added
- BlueprintCompiler into task pipeline
- L2 self-hosting support

### Changed
- Derive arsenal state from file path (draft/canonical)

### Fixed
- Proof.probes migration and probe params extraction
- Resolve remaining typecheck errors

## [0.0.8] - 2026-05-05

### Added
- Standards lifecycle DRAFT/CANONICAL
- /oxn-forge skill for generating Draft standard assets

### Changed
- Rename standards command to arsenal
- Rename standards to arsenals and unify paths

### Fixed
- Resolve low severity vulnerabilities

## [0.0.7] - 2026-05-04

### Added
- Blueprint template and Core tasks table
- Blueprints asset type support
- Blueprint CRUD and stage reference resolver

### Changed
- Extend BlueprintSchema with topology and edges
- Add scope and state filters to arsenal commands

## [0.0.6] - 2026-05-03

### Added
- Sandbox mode and arsenal export/import
- Meta-forge blueprint for guided asset generation

### Changed
- Cleanup post-mvp features - remove draft/export/gc/daemon commands and unused proofs

## [0.0.5] - 2026-05-02

### Added
- File-system-first task execution architecture
- BlueprintParser for stage declarations

### Changed
- Restructure arsenals directory and add migrate command

### Fixed
- Blueprint-parser correctly handles stage declarations in probes context

## [0.0.4] - 2026-05-01

### Added
- Blueprint template and Core tasks table

### Changed
- Migrate project DB to three-table flat schema

### Fixed
- Unify task status to uppercase and add task directory creation

## [0.0.3] - 2026-04-30

### Added
- Zod schemas for Task-Blueprint-Stage
- Refactor CLI commands
- Global --json flag and task command

### Changed
- Implement flat-schema-migrator with XnMigrator and draft system

## [0.0.2] - 2026-04-29

### Added
- Unix Socket communication for HTTP API
- Default Stage templates for fs* proofs

### Changed
- Migrate xn to oxn naming
- Rename Xenonix to OpenXenon
- Replace Playbook with Blueprint
- Unify Blueprint/Stage/Proof naming

## [0.0.1] - 2026-04-28

### Added
- Initial commit
- Skill injection system and adapters support
- Daemon health check and error handling
- Task execution API
- Xn* interfaces and core types
- Stage module and type refactoring