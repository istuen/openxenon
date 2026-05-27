## ADDED Requirements

### Requirement: Bun build configuration

The system SHALL use Bun's built-in build system to compile the project:
- Input: `./src/cli.ts`
- Output: `./dist/xn` (or `./dist/xn.exe` on Windows)
- Mode: Compiled executable (`--compile` flag)

#### Scenario: Build for current platform
- **WHEN** developer runs `pnpm build`
- **THEN** system generates executable for current platform in dist/

#### Scenario: Build with TypeScript
- **WHEN** build process starts
- **THEN** system compiles TypeScript files without external transpiler

### Requirement: Cross-platform builds

The system SHALL support building for multiple platforms:
- Linux x64: `bun-darwin-x64` → `dist/xn-linux`
- macOS x64: `bun-darwin-x64` → `dist/xn-macos`
- Windows x64: `bun-windows-x64` → `dist/xn.exe`

#### Scenario: Build for Linux
- **WHEN** developer runs `pnpm build:linux`
- **THEN** system generates Linux executable at dist/xn-linux

#### Scenario: Build for all platforms
- **WHEN** developer runs `pnpm build:all`
- **THEN** system generates executables for Linux, macOS, and Windows

### Requirement: Build output

The system SHALL place all build artifacts in the `dist/` directory:
- Executable files
- Source maps (optional)
- Type declarations (if configured)

#### Scenario: Clean build output
- **WHEN** developer runs `pnpm clean`
- **THEN** system removes dist/ directory

#### Scenario: Build creates dist directory
- **WHEN** developer runs `pnpm build` and dist/ doesn't exist
- **THEN** system creates dist/ directory automatically

### Requirement: Build optimization

The system SHALL optimize the build output:
- Tree-shaking to remove unused code
- Minification (optional via build flags)
- Dead code elimination

#### Scenario: Tree-shake unused dependencies
- **WHEN** build process runs
- **THEN** system excludes unused exports from bundle

#### Scenario: Bundle size
- **WHEN** build completes
- **THEN** executable size is reasonable (< 50MB for typical CLI)

### Requirement: Development mode

The system SHALL support running CLI in development mode without compilation:
- Run TypeScript files directly with Bun
- Enable hot reload for file changes
- Display detailed error messages with stack traces

#### Scenario: Run in development mode
- **WHEN** developer runs `pnpm dev`
- **THEN** system runs CLI directly with `bun run src/cli.ts`

#### Scenario: Development mode performance
- **WHEN** developer runs in development mode
- **THEN** CLI starts within 100ms

### Requirement: Build verification

The system SHALL verify the build output:
- Executable is created successfully
- Executable has correct permissions (chmod +x)
- Executable runs and displays help

#### Scenario: Verify build success
- **WHEN** build completes
- **THEN** system checks if executable exists and is executable

#### Scenario: Test built executable
- **WHEN** developer runs `./dist/xn --help`
- **THEN** executable displays help message correctly
