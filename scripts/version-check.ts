import { readFileSync } from 'node:fs'

const PKG_VERSION = JSON.parse(readFileSync('package.json', 'utf-8')).version

const files: Array<{
  path: string
  pattern: RegExp
  extract?: (match: RegExpMatchArray) => string
}> = [
  { path: 'README.md', pattern: /版本:\s*([\d.\-a-z]+)/ },
  { path: 'README.en.md', pattern: /Version:\s*([\d.\-a-z]+)/ },
  {
    path: 'docs/product/zh-cn/changelog/CHANGELOG.md',
    pattern: /##\s*\[([\d.\-a-z]+)\]/,
    extract: (m) => m[1]!,
  },
  {
    path: 'docs/product/en/changelog/CHANGELOG.md',
    pattern: /##\s*\[([\d.\-a-z]+)\]/,
    extract: (m) => m[1]!,
  },
  {
    path: 'packages/engine/package.json',
    pattern: /"version":\s*"([\d.\-a-z]+)"/,
    extract: (m) => m[1]!,
  },
  {
    path: 'packages/cli/package.json',
    pattern: /"version":\s*"([\d.\-a-z]+)"/,
    extract: (m) => m[1]!,
  },
  {
    path: 'docs/product/zh-cn/roadmap.md',
    pattern: /当前版本[：:]\s*\*?\*?v?([\d.\-a-z]+)/,
    extract: (m) => m[1]!,
  },
  {
    path: '.openxenon/assets/roadmaps/oxn-system.md',
    pattern: /当前自举范围[（(]\d{4}-\d{2}-\d{2}\s+([\d.\-a-z]+)\s+Phase/,
    extract: (m) => m[1]!,
  },
]

let hasError = false

for (const file of files) {
  const content = readFileSync(file.path, 'utf-8')
  const match = content.match(file.pattern)
  if (!match) continue
  const foundVersion = file.extract ? file.extract(match) : (match[1] ?? match[0])
  if (foundVersion !== PKG_VERSION) {
    console.error(`❌ ${file.path}: found version ${foundVersion}, expected ${PKG_VERSION}`)
    hasError = true
  } else {
    console.log(`✅ ${file.path}: version ${PKG_VERSION} matches`)
  }
}

if (hasError) {
  console.error('\n⚠️  Version mismatch detected. Run "bun run version:sync" to fix.')
  process.exit(1)
} else {
  console.log(`\n✅ All version references are consistent (${files.length} files checked).`)
}
