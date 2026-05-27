## ADDED Requirements

### Requirement: XnStore interface

The system SHALL define `XnStore` interface for database operations:

- `initialize(path: string)`: Initialize connection with database file path
- `exec(sql: string, params?: any[])`: Execute write operations (INSERT/UPDATE/DELETE)
- `query<T>(sql: string, params?: any[])`: Execute read operations, returns typed result
- `transaction<T>(callback: () => T)`: Execute atomic transactions
- `close()`: Gracefully close connection

#### Scenario: Initialize store connection
- **WHEN** store.initialize() is called with valid SQLite file path
- **THEN** system establishes database connection

#### Scenario: Execute write operation
- **WHEN** store.exec() is called with INSERT statement
- **THEN** data is persisted to database

#### Scenario: Execute transaction
- **WHEN** store.transaction() is called with callback
- **THEN** all operations in callback execute atomically, all commit or all rollback
