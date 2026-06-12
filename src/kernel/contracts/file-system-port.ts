export interface FileSystemPort {
  existsSync(path: string): boolean
  mkdirSync(path: string, options?: { recursive?: boolean }): void
  copyFileSync(src: string, dest: string): void
  readFileSync(path: string, encoding: string): string
  writeFileSync(path: string, data: string, encoding: string): void
}
