export interface OsPort {
  getHomedir(): string
  getGlobalBoundaryPath(): string
  join(...segments: string[]): string
}
