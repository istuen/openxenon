export const cliContext = {
  jsonMode: false,

  setJsonMode(enabled: boolean) {
    this.jsonMode = enabled
  },

  isJsonMode(): boolean {
    if (this.jsonMode) return true
    return process.argv.includes('--json') || process.argv.includes('-j')
  }
}

export function outputJson(data: unknown): void {
  if (cliContext.isJsonMode()) {
    console.log(JSON.stringify(data, null, 2))
  }
}
