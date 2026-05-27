## ADDED Requirements

### Requirement: XnRadar interface

The system SHALL define `XnRadar` interface for file system watching:

- `watch(path, callback, options)`: Watch file/directory changes
- Returns cancel function to stop watching

#### Scenario: Watch file modification
- **WHEN** radar.watch() is called on a file
- **THEN** callback fires on file modification with 'modify' event

#### Scenario: Watch directory creation
- **WHEN** radar.watch() is called on a directory
- **THEN** callback fires on file creation with 'create' event

#### Scenario: Cancel watch
- **WHEN** cancel function returned by watch() is called
- **THEN** system stops watching the path

#### Scenario: Debounce filter
- **WHEN** rapid file changes occur (e.g., IDE auto-save)
- **THEN** callback fires once after debounceMs (default 50ms)