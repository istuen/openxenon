import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenXenon',
  description: '工程师与 AI 协作工作台 — 工程师定义意图，AI 执行对齐，OXN 证明结果',
  cleanUrls: false,
  base: '/openxenon/',
  lastUpdated: true,

  // 只编译 docs/*.md 与 docs/examples/**，
  // 排除旧 docs/{core,architecture,reference,guides,design,horizon,changelog} 子目录
  srcDir: '.',
  srcExclude: [
    'core/**',
    'architecture/**',
    'reference/**',
    'guides/**',
    'design/**',
    'horizon/**',
    'changelog/**',
    'en/**',
    'zh-cn/**',
  ],

  markdown: {
    config: (md) => {
      // 允许内嵌相对路径
      return md
    },
  },

  // v0.1.0 起步阶段：链接到旧 docs/{core,architecture,reference,guides,design,horizon,changelog}
  // 的引用为有意为之（保留历史跳转）。等手册完成统一处理后恢复严格校验。
  ignoreDeadLinks: [
    // 指向旧 subdir 的相对路径（带 .md 后缀）
    /^\.\/architecture\//,
    /^\.\/reference\//,
    /^\.\/guides\//,
    /^\.\/design\//,
    /^\.\/horizon\//,
    /^\.\/changelog\//,
    /^\.\/core\//,
    /^\.\/en\//,
    /^\.\/zh-cn\//,
    // 根 README 跨仓引用
    /^\.\.\/README/,
    /^\.\/\.\.\/README/,
  ],

  themeConfig: {
    siteTitle: 'OpenXenon',

    nav: [
      { text: 'Home', link: '/index.html' },
      { text: 'Docs', link: '/introduction.html' },
      { text: 'AI Prompt', link: '/llm-prompt.html' },
    ],

    sidebar: {
      '/': [
        {
          text: '开始',
          items: [
            { text: 'Introduction', link: '/introduction.html' },
            { text: 'Quickstart', link: '/quickstart.html' },
          ],
        },
        {
          text: '范式与核心概念',
          items: [{ text: 'Core Concepts', link: '/core-concepts.html' }],
        },
        {
          text: 'IAP 三轴',
          items: [
            { text: 'Intent', link: '/intent.html' },
            { text: 'Align', link: '/align.html' },
            { text: 'Proof', link: '/proof.html' },
          ],
        },
        {
          text: '实战',
          items: [
            { text: 'Recipes', link: '/recipes.html' },
            { text: 'DDD in Practice', link: '/ddd-in-practice.html' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: 'CLI', link: '/cli.html' },
            { text: 'Architecture', link: '/architecture.html' },
            { text: 'Extending', link: '/extending.html' },
            { text: 'Roadmap', link: '/roadmap.html' },
          ],
        },
        {
          text: '附录',
          items: [
            { text: 'Glossary', link: '/glossary.html' },
            { text: 'IAP Cheatsheet', link: '/iap-cheatsheet.html' },
            { text: 'FAQ', link: '/faq.html' },
          ],
        },
      ],

      '/llm-prompt/': [{ text: 'AI 协作者入口', items: [{ text: 'llm-prompt', link: '/llm-prompt.html' }] }],
    },

    search: { provider: 'local' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/istuen/openxenon' }],

    footer: {
      message: 'OpenXenon · 工程师与 AI 协作工作台',
      copyright: `MIT License · ${new Date().getFullYear()}`,
    },
  },
})
