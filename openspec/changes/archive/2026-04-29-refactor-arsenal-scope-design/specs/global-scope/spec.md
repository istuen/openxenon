## ADDED Requirements

### Requirement: oxn-forge --global flag

The system SHALL support `--global` / `-g` flag on `oxn-forge` skill:
- Without flag: Creates draft asset in project Arsenal
- With `--global`: Creates draft asset in global Arsenal

#### Scenario: Forge project-level asset (default)
- **WHEN** user calls `/oxn-forge 创建一个检查文件存在的 Probe`
- **THEN** system creates probe in `<project>/.openxenon/arsenals/probes/draft/`

#### Scenario: Forge global-level asset with --global
- **WHEN** user calls `/oxn-forge --global 创建一个检查文件存在的 Probe`
- **THEN** system creates probe in `~/.openxenon/arsenals/probes/draft/`

### Requirement: Global Arsenal directory structure

The system SHALL maintain global Arsenal at `~/.openxenon/arsenals/` with structure:
```
~/.openxenon/arsenals/
├── probes/
│   ├── draft/
│   └── canonical/
├── proofs/
│   ├── draft/
│   └── canonical/
├── stages/
│   ├── draft/
│   └── canonical/
└── blueprints/
    ├── draft/
    └── canonical/
```

#### Scenario: Global Arsenal initialization
- **WHEN** OpenXenon CLI runs for the first time
- **THEN** system creates `~/.openxenon/arsenals/` with required subdirectories