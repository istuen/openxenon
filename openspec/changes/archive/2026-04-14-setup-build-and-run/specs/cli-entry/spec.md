## ADDED Requirements

### Requirement: CLI entry point

The system SHALL provide a CLI entry point at `src/cli.ts` that:
- Initializes the CLI application
- Defines CLI metadata (name, version, description)
- Registers all sub-commands
- Handles global options and flags

#### Scenario: Run CLI without arguments
- **WHEN** user runs `xn` without any arguments
- **THEN** system displays help message with available commands

#### Scenario: Display version
- **WHEN** user runs `xn --version`
- **THEN** system displays current version number

#### Scenario: Display help
- **WHEN** user runs `xn --help`
- **THEN** system displays detailed help message with command list

### Requirement: Command registration

The system SHALL support registering sub-commands using Citty framework:
- Each command is defined in a separate file under `src/commands/`
- Commands are lazily loaded for performance
- Commands support nested sub-commands (e.g., `xn daemon start`)

#### Scenario: Register init command
- **WHEN** CLI starts
- **THEN** system registers `init` command from `src/commands/init.ts`

#### Scenario: Register daemon command
- **WHEN** CLI starts
- **THEN** system registers `daemon` command with `start`, `stop`, `status` sub-commands

### Requirement: Binary configuration

The system SHALL configure `package.json` bin field to expose CLI:
- Binary name: `xn`
- Binary entry: `./dist/xn` (compiled executable) or `./src/cli.ts` (development)

#### Scenario: Install CLI globally
- **WHEN** developer runs `pnpm install -g`
- **THEN** `xn` command is available system-wide

#### Scenario: Run via npx
- **WHEN** developer runs `npx xn init`
- **THEN** system executes init command without global installation

### Requirement: Error handling

The system SHALL handle CLI errors gracefully:
- Invalid commands display helpful error message
- Missing arguments display usage information
- Unexpected errors display stack trace in development mode

#### Scenario: Handle invalid command
- **WHEN** user runs `xn invalid-command`
- **THEN** system displays error: "Unknown command 'invalid-command'"

#### Scenario: Handle missing argument
- **WHEN** user runs `xn init` without required argument
- **THEN** system displays usage: "Usage: xn init <project-name>"

### Requirement: Output formatting

The system SHALL format CLI output consistently:
- Success messages use green color
- Error messages use red color
- Warning messages use yellow color
- Information messages use default color

#### Scenario: Display success message
- **WHEN** command executes successfully
- **THEN** system displays message in green with checkmark symbol

#### Scenario: Display error message
- **WHEN** command fails
- **THEN** system displays error message in red with cross symbol
