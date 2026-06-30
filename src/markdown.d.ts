declare module '*.md' {
  const content: string
  export default content
}

declare module '*/SKILL.md' {
  const content: string
  export default content
}

declare module '*/locales/*/*.md' {
  const content: string
  export default content
}

declare module '*/locales/*/*/*.md' {
  const content: string
  export default content
}
declare module 'which'
