## ADDED Requirements

### Requirement: XnTransport interface

The system SHALL define `XnTransport` interface for IPC:

- `serve(path, onMessage)`: Start server listening on Unix Socket
- `request(path, payload, timeout)`: Send request and wait for response
- `destroy()`: Destroy transport and cleanup

#### Scenario: Server serves on Unix socket
- **WHEN** transport.serve() is called with socket path
- **THEN** system listens on specified Unix socket path

#### Scenario: Client sends request
- **WHEN** transport.request() is called with payload
- **THEN** system sends payload and returns response buffer

#### Scenario: Request timeout
- **WHEN** transport.request() times out (default 30000ms)
- **THEN** system throws timeout error

#### Scenario: Destroy transport
- **WHEN** transport.destroy() is called
- **THEN** socket file is removed and resources freed