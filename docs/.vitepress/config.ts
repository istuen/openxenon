import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenXenon',
  description: '工程师与 AI 协作工作台 — 工程师定义意图，AI 执行对齐，OXN 证明结果',
  cleanUrls: false,
  base: '/openxenon/',
  lastUpdated: true,

  // v0.1.0 起步阶段：编译根目录的 docs/，扫描 docs/zh-cn/ 和 docs/en/
  // 旧 SSOT 子目录（core/architecture/reference/...）在 srcExclude 排除
  srcDir: '.',
  srcExclude: [
    'core/**',
    'architecture/**',
    'reference/**',
    'guides/**',
    'design/**',
    'horizon/**',
    'changelog/**',
    '_archive/**',
  ],

  markdown: {
    config: (md) => {
      return md
    },
  },

  // v0.1.0 起步阶段：链接到旧 docs/{core,architecture,reference,guides,...} 的
  // 引用为有意为之（保留历史跳转）。
  ignoreDeadLinks: [
    // 从 docs/zh-cn/*.md 出发的相对路径（./）
    /^\.\/architecture\//,
    /^\.\/reference\//,
    /^\.\/guides\//,
    /^\.\/design\//,
    /^\.\/horizon\//,
    /^\.\/changelog\//,
    /^\.\/core\//,
    // 从根 docs/*.md 出发的相对路径（../）
    /^\.\.\/architecture\//,
    /^\.\.\/reference\//,
    /^\.\.\/guides\//,
    /^\.\.\/design\//,
    /^\.\.\/horizon\//,
    /^\.\.\/changelog\//,
    /^\.\.\/core\//,
    /^\.\.\/README/,
    /^\.\/\.\.\/README/,
  ],

  // 根路径 '/' 重定向到中文站首页
  rewrites: {
    '/': '/zh-cn/index.html',
  },

  // VitePress i18n 配置：v0.1.0 启用 locales 块
  // - zh-CN: 完整中文站点
  // - en:    英文占位（v0.2+ 翻译后启用，内容相同目录结构）
  locales: {
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'OpenXenon · 工程师与 AI 协作工作台',
      description: '工程师定义意图，AI 执行对齐，OXN 证明结果',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh-cn/index.html' },
          { text: '文档', link: '/zh-cn/introduction.html' },
          { text: 'AI 入口', link: '/zh-cn/llm-prompt.html' },
        ],
        sidebar: {
          '/zh-cn/': [
            {
              text: '开始',
              items: [
                { text: '介绍', link: '/zh-cn/introduction.html' },
                { text: '快速开始', link: '/zh-cn/quickstart.html' },
              ],
            },
            {
              text: '范式与核心概念',
              items: [{ text: '核心概念', link: '/zh-cn/core-concepts.html' }],
            },
            {
              text: 'IAP 三轴',
              items: [
                { text: '意图轴', link: '/zh-cn/intent.html' },
                { text: '对齐轴', link: '/zh-cn/align.html' },
                { text: '证明轴', link: '/zh-cn/proof.html' },
              ],
            },
            {
              text: '实战',
              items: [
                { text: '实战案例', link: '/zh-cn/recipes.html' },
                { text: 'DDD 实战', link: '/zh-cn/ddd-in-practice.html' },
              ],
            },
            {
              text: '参考',
              items: [
                { text: 'CLI 参考', link: '/zh-cn/cli.html' },
                { text: '架构', link: '/zh-cn/architecture.html' },
                { text: '扩展', link: '/zh-cn/extending.html' },
                { text: '路线图', link: '/zh-cn/roadmap.html' },
              ],
            },
            {
              text: '附录',
              items: [
                { text: '术语表', link: '/zh-cn/glossary.html' },
                { text: 'IAP 速记卡', link: '/zh-cn/iap-cheatsheet.html' },
                { text: '常见问题', link: '/zh-cn/faq.html' },
              ],
            },
          ],
          '/zh-cn/llm-prompt/': [
            { text: 'AI 协作者', items: [{ text: 'llm-prompt', link: '/zh-cn/llm-prompt.html' }] },
          ],
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'OpenXenon · Engineer + AI Workbench',
      description: 'Engineers define intent, AI executes alignment, OXN proves results',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/index.html' },
          { text: 'Docs', link: '/en/introduction.html' },
          { text: 'AI Entry', link: '/en/llm-prompt.html' },
        ],
        sidebar: {
          '/en/': [
            {
              text: 'Get Started',
              items: [
                { text: 'Introduction', link: '/en/introduction.html' },
                { text: 'Quickstart', link: '/en/quickstart.html' },
              ],
            },
            {
              text: 'Paradigm & Core Concepts',
              items: [{ text: 'Core Concepts', link: '/en/core-concepts.html' }],
            },
            {
              text: 'IAP Three Axes',
              items: [
                { text: 'Intent', link: '/en/intent.html' },
                { text: 'Align', link: '/en/align.html' },
                { text: 'Proof', link: '/en/proof.html' },
              ],
            },
            {
              text: 'Practice',
              items: [
                { text: 'Recipes', link: '/en/recipes.html' },
                { text: 'DDD in Practice', link: '/en/ddd-in-practice.html' },
              ],
            },
            {
              text: 'Reference',
              items: [
                { text: 'CLI', link: '/en/cli.html' },
                { text: 'Architecture', link: '/en/architecture.html' },
                { text: 'Extending', link: '/en/extending.html' },
                { text: 'Roadmap', link: '/en/roadmap.html' },
              ],
            },
            {
              text: 'Appendix',
              items: [
                { text: 'Glossary', link: '/en/glossary.html' },
                { text: 'IAP Cheatsheet', link: '/en/iap-cheatsheet.html' },
                { text: 'FAQ', link: '/en/faq.html' },
              ],
            },
          ],
          '/en/llm-prompt/': [{ text: 'AI Entry', items: [{ text: 'llm-prompt', link: '/en/llm-prompt.html' }] }],
        },
      },
    },
  },

  themeConfig: {
    siteTitle: 'OpenXenon',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/istuen/openxenon' }],
    footer: {
      message: 'OpenXenon · 工程师与 AI 协作工作台',
      copyright: `MIT License · ${new Date().getFullYear()}`,
    },
  },
})
