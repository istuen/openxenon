# 7. Building from Source

## Requirements

- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

## Build Steps

### 1. Clone Repository

```bash
git clone https://forgejo.isteed.dev/issac/openxenon.git
cd openxenon
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Development Mode

```bash
# Run CLI directly (no compilation needed)
pnpm dev -- --help

# Or run tests
pnpm test
```

### 4. Build Executable

```bash
# Build for current platform
pnpm build

# Build for all platforms
pnpm build:all

# Or build individually
pnpm build:linux   # Linux x64
pnpm build:macos   # macOS x64
pnpm build:windows # Windows x64
```

### 5. Run Built Binary

```bash
./dist/oxn --help
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run CLI in development mode |
| `pnpm build` | Build executable for current platform |
| `pnpm build:all` | Build executable for all platforms |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm clean` | Clean build artifacts and dependencies |

## Project Structure

```
openxenon/
├── src/
│   ├── cli/          # CLI command implementation
│   ├── daemon/       # Daemon (0.2 goal)
│   ├── kernel/       # Core logic layer (pure functions)
│   ├── infra/        # Infrastructure layer
│   └── skills/       # Skill source (read by AI)
├── docs/
│   ├── manual/       # User documentation
│   └── architecture.md # Architecture design
└── dist/             # Build artifacts
```

## Contributing

1. Fork repository and create branch
2. Follow project code style (TypeScript strict mode)
3. Ensure `pnpm typecheck` and `pnpm test` pass
4. Submit Pull Request

## Next Chapter

The previous chapter introduced [Troubleshooting](./troubleshooting.md).