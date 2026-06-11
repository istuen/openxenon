import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { FileSystemPort } from '../kernel/index'

export const fileSystemPort: FileSystemPort = {
  existsSync,
  mkdirSync: (path, options) => mkdirSync(path, options),
  copyFileSync,
  readFileSync: (path, encoding) => readFileSync(path, { encoding: encoding as BufferEncoding }) as string,
  writeFileSync: (path, data, encoding) => writeFileSync(path, data, { encoding: encoding as BufferEncoding }),
}
