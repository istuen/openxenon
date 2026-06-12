## ADDED Requirements

### Requirement: Package.json configuration

The system SHALL provide a `package.json` file at the project root that defines:
- Project metadata (name, version, description, author)
- Entry points (main, bin, types)
- Dependencies and devDependencies
- NPM scripts for development, build, and test

#### Scenario: Initialize project with package.json
- **WHEN** developer runs `pnpm install`
- **THEN** system reads package.json and installs all defined dependencies

#### Scenario: Run npm scripts
- **WHEN** developer runs `pnpm build`
- **THEN** system executes the build script defined in package.json

### Requirement: Dependencies management

The system SHALL define the following dependencies:
- `citty`: CLI framework for building command-line interfaces
- `bun-types`: Type definitions for Bun runtime (including SQLite types)

The system SHALL define the following devDependencies:
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions

#### Scenario: Install production dependencies
- **WHEN** developer runs `pnpm install --prod`
- **THEN** system installs only dependencies, not devDependencies

#### Scenario: Install all dependencies
- **WHEN** developer runs `pnpm install`
- **THEN** system installs both dependencies and devDependencies

#### Scenario: SQLite type support
- **WHEN** code imports from `bun:sqlite`
- **THEN** TypeScript compiler recognizes Database, Statement and other SQLite types

### Requirement: NPM scripts

The system SHALL provide the following npm scripts:
- `dev`: Run CLI in development mode
- `build`: Build executable for current platform
- `build:all`: Build executables for all platforms
- `test`: Run test suite
- `typecheck`: Run TypeScript type checking
- `clean`: Remove build artifacts

#### Scenario: Run development mode
- **WHEN** developer runs `pnpm dev`
- **THEN** system runs CLI directly with Bun without compilation

#### Scenario: Build for production
- **WHEN** developer runs `pnpm build`
- **THEN** system compiles TypeScript and bundles into single executable

### Requirement: TypeScript configuration

The system SHALL provide a `tsconfig.json` file with:
- `strict: true` for strict type checking
- `target: ESNext` for latest JavaScript features
- `module: ESNext` for ES modules
- `moduleResolution: bundler` for Bun compatibility
- `skipLibCheck: true` for faster compilation

#### Scenario: Type check project
- **WHEN** developer runs `pnpm typecheck`
- **THEN** system validates TypeScript types without emitting files

#### Scenario: Support Bun-specific types
- **WHEN** code uses Bun-specific APIs (e.g., `Bun.serve`)
- **THEN** TypeScript compiler recognizes and validates these types

### Requirement: Git ignore configuration

The system SHALL provide a `.gitignore` file that excludes:
- `node_modules/`: Installed dependencies
- `dist/`: Build artifacts
- `*.log`: Log files
- `.DS_Store`: macOS system files
- `*.db`: SQLite database files
- `*.db-journal`, `*.db-wal`: SQLite journal files

#### Scenario: Prevent committing dependencies
- **WHEN** developer runs `git status`
- **THEN** node_modules directory is not shown in untracked files

#### Scenario: Prevent committing build artifacts
- **WHEN** developer runs `git status` after building
- **THEN** dist directory is not shown in untracked files
