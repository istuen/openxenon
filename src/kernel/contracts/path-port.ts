export interface PathPort {
  join(...segments: string[]): string
  resolve(base: string, ...segments: string[]): string
}
