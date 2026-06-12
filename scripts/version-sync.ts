import { readFileSync, writeFileSync } from 'node:fs'

const PKG_VERSION = JSON.parse(readFileSync('package.json', 'utf-8')).version

const files = [{ path: 'README.md', find: /版本:\s*[\d.]+/, replace: `版本: ${PKG_VERSION}` }]

for (const file of files) {
  let content = readFileSync(file.path, 'utf-8')
  if (file.find.test(content)) {
    content = content.replace(file.find, file.replace)
    writeFileSync(file.path, content, 'utf-8')
    console.log(`✅ Updated ${file.path}`)
  }
}

console.log(`\n✅ Version sync complete: all references now point to ${PKG_VERSION}`)
