import { readFileSync } from 'node:fs'

const PKG_VERSION = JSON.parse(readFileSync('package.json', 'utf-8')).version

const files = [
  { path: 'README.md', pattern: /版本:\s*([\d.]+)/ },
  { path: 'README.en.md', pattern: /Version:\s*([\d.]+)/ },
  { path: 'docs/product/zh-cn/changelog/CHANGELOG.md', pattern: /##\s*\[([\d.\-a-z]+)\]/ },
  { path: 'docs/product/en/changelog/CHANGELOG.md', pattern: /##\s*\[([\d.\-a-z]+)\]/ },
]

let hasError = false

for (const file of files) {
  const content = readFileSync(file.path, 'utf-8')
  const match = content.match(file.pattern)
  if (match) {
    const foundVersion = match[1] ?? match[0]
      .replace(/版本:\s*/, '')
      .replace(/Version:\s*/, '')
      .replace(/##\s*\[/, '')
      .replace(/]/, '')
    if (foundVersion !== PKG_VERSION) {
      console.error(`❌ ${file.path}: found version ${foundVersion}, expected ${PKG_VERSION}`)
      hasError = true
    } else {
      console.log(`✅ ${file.path}: version ${PKG_VERSION} matches`)
    }
  }
}

if (hasError) {
  console.error('\n⚠️  Version mismatch detected. Run "bun run version:sync" to fix.')
  process.exit(1)
} else {
  console.log('\n✅ All version references are consistent.')
}
