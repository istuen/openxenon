import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenXenon',
  description: '工程师与 AI 协作工作台 — 工程师定义意图，AI 执行对齐，OXN 证明结果',
  cleanUrls: false,
  base: '/openxenon/',
  lastUpdated: true,

  // v0.3 PR-C：注入自定义 CSS（5 类 H1 顶部色条 + 11 类 H2 左边框 + 浅色背景）
  head: [['link', { rel: 'stylesheet', href: '/.vitepress/theme/custom.css' }]],

  // 站点结构（VitePress 对称 prefix i18n 模式）：
  //   docs/index.md         → /openxenon/            （中文首页 = 介绍内容，root 路径）
  //   docs/zh-cn/foo.md     → /openxenon/zh-cn/foo.html  （中文其他 15 章 + examples/）
  //   docs/en/foo.md        → /openxenon/en/foo.html     （英文 16 占位 + examples/）
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
    /^\.\/architecture\//,
    /^\.\/reference\//,
    /^\.\/guides\//,
    /^\.\/design\//,
    /^\.\/horizon\//,
    /^\.\/changelog\//,
    /^\.\/core\//,
    /^\.\/intent/,
    /^\.\/align/,
    /^\.\/proof/,
    /^\.\.\/architecture\//,
    /^\.\.\/reference\//,
    /^\.\.\/guides\//,
    /^\.\.\/design\//,
    /^\.\.\/horizon\//,
    /^\.\.\/changelog\//,
    /^\.\.\/core\//,
    /^\.\.\/README/,
    // v0.6 RFC links 跳出 srcDir (docs/) 指向仓库根 .openxenon/ — pre-existing pattern, accept
    /^\.\/\.\.\/\.openxenon\//, // ./../../.openxenon/ (form B: dot-slash + 2 dots — actual VitePress form)
    /^\.\/\.\.\/\.\.\/\.openxenon\//, // ./../../../.openxenon/ (form C, in development/)
    /^\.\/\.\.\/\.\.\/\.\.\/\.openxenon\//, // ./../../../../.openxenon/ (form D)
    /^\.\.\/\.openxenon\//, // ../../.openxenon/ (form A — alternate, bare)
    // development/v0.6-release-guide.md pre-existing links (not yet authored)
    /^\.\/\.\.\/v0\.7-hall-migration-plan/, // v0.7 RFC, not yet exist (after VitePress normalize: ./../v0.7-...)
    /^\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.openxenon\/..\/0-6-0-iap-refactor/, // malformed path in v0.6-release-guide.md (development/, 5 levels up: 4 ..'s + .openxenon)
  ],

  // VitePress 标准 i18n：两个 locale 都用 prefix（对称结构，天然支持同页切换）
  // - zh-CN: 中文站，目录 docs/zh-cn/，URL prefix /zh-cn/
  // - en:    英文站，目录 docs/en/，URL prefix /en/
  locales: {
    'zh-cn': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-cn/',
      title: 'OpenXenon · 工程师与 AI 协作工作台',
      description: '工程师定义意图，AI 执行对齐，OXN 证明结果',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh-cn/index.html' },
          { text: '快速开始', link: '/zh-cn/quickstart.html' },
          { text: 'AI 入口', link: '/zh-cn/llm-prompt.html' },
        ],
        sidebar: {
          '/zh-cn/': [
            {
              text: '开始',
              items: [
                { text: '介绍', link: '/zh-cn/index.html' },
                { text: '快速开始', link: '/zh-cn/quickstart.html' },
              ],
            },
            {
              text: '范式与核心概念',
              items: [{ text: '核心概念', link: '/zh-cn/core-concepts.html' }],
            },
            {
              text: 'OXN 四结构实体（v0.6）',
              items: [
                { text: 'Asset · E1 静态边界', link: '/zh-cn/asset.html' },
                { text: 'Work · E2 动态协作', link: '/zh-cn/work.html' },
                { text: 'Proof · E3 独立公证', link: '/zh-cn/proof.html' },
                { text: 'Insight · E4 涌现层', link: '/zh-cn/insight.html' },
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
      link: '/en/',
      title: 'OpenXenon · Engineer + AI Workbench',
      description: 'Engineers define intent, AI executes alignment, OXN proves results',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/index.html' },
          { text: 'Quickstart', link: '/en/quickstart.html' },
          { text: 'AI Entry', link: '/en/llm-prompt.html' },
        ],
        sidebar: {
          '/en/': [
            {
              text: 'Get Started',
              items: [
                { text: 'Introduction', link: '/en/index.html' },
                { text: 'Quickstart', link: '/en/quickstart.html' },
              ],
            },
            {
              text: 'Paradigm & Core Concepts',
              items: [{ text: 'Core Concepts', link: '/en/core-concepts.html' }],
            },
            {
              text: 'OXN Structural Entities (v0.6)',
              items: [
                { text: 'Asset · E1 Static Boundary', link: '/en/asset.html' },
                { text: 'Work · E2 Dynamic Collaboration', link: '/en/work.html' },
                { text: 'Insight · E4 Emergence', link: '/en/insight.html' },
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
