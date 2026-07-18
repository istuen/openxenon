import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenXenon',
  description: '轻量级人机协作工具 — 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
  cleanUrls: false,
  base: '/openxenon/',
  lastUpdated: true,

  // v0.3 PR-C：注入自定义 CSS（5 类 H1 顶部色条 + 11 类 H2 左边框 + 浅色背景）
  head: [['link', { rel: 'stylesheet', href: '/.vitepress/theme/custom.css' }]],

  // 站点结构（v0.7 重构：topic-first 语言第二）：
  //   docs/index.md                              → /openxenon/                 （自动重定向）
  //   docs/product/zh-cn/*.md                    → /openxenon/product/zh-cn/   （产品手册 · 中文）
  //   docs/product/en/*.md                       → /openxenon/product/en/      （Product Manual）
  //   docs/dev/zh-cn/*.md                        → /openxenon/dev/zh-cn/       （开发手册 · 中文）
  //   docs/rfc/zh-cn/*.md                        → /openxenon/rfc/zh-cn/       （决策记录 · 中文）
  // 旧子目录（core/architecture/reference/...）在 srcExclude 排除
  srcDir: '.',
  srcExclude: [
    'core/**',
    'architecture/**',
    'reference/**',
    'guides/**',
    'design/**',
    'horizon/**',
    '_archive/**',
    'product/en/changelog/**',
  ],

  markdown: {
    config: (md) => {
      return md
    },
  },

  // 忽略死链规则
  ignoreDeadLinks: [
    /^\.\/architecture\//,
    /^\.\/reference\//,
    /^\.\/guides\//,
    /^\.\/design\//,
    /^\.\/horizon\//,
    /^\.\/core\//,
    /^\.\/intent/,
    /^\.\/align/,
    /^\.\/proof/,
    /^\.\/.*\.oxn$/,
    /^\.\/changelog\//,
    /^\.\.\/architecture\//,
    /^\.\.\/reference\//,
    /^\.\.\/guides\//,
    /^\.\.\/design\//,
    /^\.\.\/horizon\//,
    /^\.\.\/core\//,
    /^\.\.\/README/,
    // v0.7 重构：docs/ → .openxenon/ 严格隔离
    /\.\.+\/\.openxenon\//,
    // 历史 pools/sprints 路径
    /\.\.+\/\.openxenon\/pools\/sprints\//,
    // dev/ 文件引用 AGENTS.md
    /\.\.+\/AGENTS/,
    // dev/extending 路径误报
    /\.\.+\/dev\/extending/,
    // en 站点内的 cross-locale 链接
    /^\.\.\/zh-cn\//,
    /^\.\/zh-cn\//,
    // adrs/pools 路径（历史）
    /^\.\.\/\.openxenon\/docs\/adrs\//,
    /^\.\.\/\.openxenon\/docs\/rfcs\//,
    /^\.\.\/\.openxenon\/pools\//,
    // asset-templates 引用的 .md
    /^\.\/(domain|workflow|stack|roadmap)$/,
  ],

  // v0.7 重构：locale key 改 topic-first
  locales: {
    '/product/zh-cn/': {
      label: '产品手册',
      lang: 'zh-CN',
      link: '/product/zh-cn/',
      title: 'OpenXenon · 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
      description: '轻量级人机协作工具 — 工程师信任 AI Agent 在边界内的执行成果',
      themeConfig: {
        nav: [
          { text: '产品手册', link: '/product/zh-cn/' },
          { text: '开发手册', link: '/dev/zh-cn/' },
          { text: '决策记录', link: '/rfc/zh-cn/' },
          { text: '快速开始', link: '/product/zh-cn/quickstart.html' },
          { text: 'AI 入口', link: '/product/zh-cn/ai-entry.html' },
        ],
        sidebar: {
          '/product/zh-cn/': [
            {
              text: '介绍与开始',
              items: [
                { text: '产品手册首页', link: '/product/zh-cn/' },
                { text: '介绍', link: '/product/zh-cn/introduction.html' },
                { text: '快速开始', link: '/product/zh-cn/quickstart.html' },
                { text: 'AI 协作者入口', link: '/product/zh-cn/ai-entry.html' },
                { text: '常见问题', link: '/product/zh-cn/faq.html' },
                { text: '路线图', link: '/product/zh-cn/roadmap.html' },
              ],
            },
            {
              text: '范式与实体（E1-E4）',
              items: [
                { text: 'IAP 范式与信任链', link: '/product/zh-cn/concepts/iap-paradigm.html' },
                { text: 'Asset · E1', link: '/product/zh-cn/concepts/asset.html' },
                { text: 'Work · E2', link: '/product/zh-cn/concepts/work.html' },
                { text: 'Proof · E3', link: '/product/zh-cn/concepts/proof.html' },
                { text: 'Insight · E4', link: '/product/zh-cn/concepts/insight.html' },
                { text: 'Asset Paper', link: '/product/zh-cn/concepts/asset-paper.html' },
              ],
            },
            {
              text: '实战',
              items: [
                { text: '实战案例', link: '/product/zh-cn/practice/recipes.html' },
                { text: 'DDD 实战', link: '/product/zh-cn/practice/ddd-in-practice.html' },
                { text: '端到端示例', link: '/product/zh-cn/practice/examples/' },
              ],
            },
            {
              text: '用户参考',
              items: [
                { text: 'CLI 用户指南', link: '/product/zh-cn/reference/cli-user-guide.html' },
                { text: '术语表', link: '/product/zh-cn/reference/glossary.html' },
                { text: 'IAP 速记卡', link: '/product/zh-cn/reference/iap-cheatsheet.html' },
                { text: 'Asset 模板库', link: '/product/zh-cn/reference/asset-templates/' },
              ],
            },
          ],
        },
      },
    },
    '/dev/zh-cn/': {
      label: '开发手册',
      lang: 'zh-CN',
      link: '/dev/zh-cn/',
      title: 'OpenXenon · 开发手册',
      description: 'OXN 贡献者手册 — 架构、扩展、发布',
      themeConfig: {
        nav: [
          { text: '产品手册', link: '/product/zh-cn/' },
          { text: '开发手册', link: '/dev/zh-cn/' },
          { text: '决策记录', link: '/rfc/zh-cn/' },
        ],
        sidebar: {
          '/dev/zh-cn/': [
            {
              text: '开发总览',
              items: [
                { text: '开发手册首页', link: '/dev/zh-cn/' },
                { text: '入门（环境+仓库）', link: '/dev/zh-cn/getting-started.html' },
                { text: '架构总览', link: '/dev/zh-cn/architecture.html' },
                { text: 'Monorepo 双包', link: '/dev/zh-cn/monorepo.html' },
                { text: 'L0-L3 宪法', link: '/dev/zh-cn/l0-l3-constitution.html' },
                { text: 'OXN CLI 开发者手册', link: '/dev/zh-cn/oxn-cli.html' },
                { text: 'OXN Engine 开发者手册', link: '/dev/zh-cn/oxn-engine.html' },
              ],
            },
            {
              text: '概念与机制',
              items: [
                { text: '三层文档守门', link: '/dev/zh-cn/three-tier-docs.html' },
                { text: 'AI 协作工作流', link: '/dev/zh-cn/ai-collaboration.html' },
              ],
            },
            {
              text: '扩展点',
              items: [
                { text: '扩展总览', link: '/dev/zh-cn/extending/' },
                { text: '自定义 Probe', link: '/dev/zh-cn/extending/custom-probe.html' },
                { text: '自定义 Part', link: '/dev/zh-cn/extending/custom-part.html' },
                { text: 'DSL 扩展', link: '/dev/zh-cn/extending/dsl-extension.html' },
                { text: 'Skill 编写', link: '/dev/zh-cn/extending/skill-authoring.html' },
              ],
            },
            {
              text: '工程实践',
              items: [
                { text: '测试策略', link: '/dev/zh-cn/testing.html' },
                { text: '发布流程', link: '/dev/zh-cn/releasing.html' },
                { text: '调试指南', link: '/dev/zh-cn/debugging.html' },
                { text: '代码规范', link: '/dev/zh-cn/conventions.html' },
              ],
            },
          ],
        },
      },
    },
    '/rfc/zh-cn/': {
      label: '决策记录',
      lang: 'zh-CN',
      link: '/rfc/zh-cn/',
      title: 'OpenXenon · 决策记录',
      description: 'OXN 开发决策的 OXP Proposal 归档',
      themeConfig: {
        nav: [
          { text: '产品手册', link: '/product/zh-cn/' },
          { text: '开发手册', link: '/dev/zh-cn/' },
          { text: '决策记录', link: '/rfc/zh-cn/' },
        ],
        sidebar: {
          '/rfc/zh-cn/': [
            {
              text: '决策记录',
              items: [{ text: 'OXP 索引', link: '/rfc/zh-cn/' }],
            },
          ],
        },
      },
    },
    '/product/en/': {
      label: 'Product Manual',
      lang: 'en-US',
      link: '/product/en/',
      title: 'OpenXenon · Engineers define intent, AI Agents run alignment, OXN Engine emits proof',
      description: 'Lightweight human–AI collaboration tool — engineers trust AI Agents within boundaries',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/product/en/' },
          { text: 'Quickstart', link: '/product/en/quickstart.html' },
          { text: 'AI Entry', link: '/product/en/llm-prompt.html' },
        ],
        sidebar: {
          '/product/en/': [
            {
              text: 'Get Started',
              items: [
                { text: 'Introduction', link: '/product/en/' },
                { text: 'Quickstart', link: '/product/en/quickstart.html' },
              ],
            },
            {
              text: 'Paradigm & Core Concepts',
              items: [{ text: 'Core Concepts', link: '/product/en/core-concepts.html' }],
            },
            {
              text: 'OXN Structural Entities (v0.6)',
              items: [
                { text: 'Asset · E1 Static Boundary', link: '/product/en/asset.html' },
                { text: 'Work · E2 Dynamic Collaboration', link: '/product/en/work.html' },
                { text: 'Insight · E4 Emergence', link: '/product/en/insight.html' },
              ],
            },
            {
              text: 'Practice',
              items: [
                { text: 'Recipes', link: '/product/en/recipes.html' },
                { text: 'DDD in Practice', link: '/product/en/ddd-in-practice.html' },
              ],
            },
            {
              text: 'Reference',
              items: [
                { text: 'CLI', link: '/product/en/cli.html' },
                { text: 'Architecture', link: '/product/en/architecture.html' },
                { text: 'Extending', link: '/product/en/extending.html' },
                { text: 'Roadmap', link: '/product/en/roadmap.html' },
              ],
            },
            {
              text: 'Appendix',
              items: [
                { text: 'Glossary', link: '/product/en/glossary.html' },
                { text: 'IAP Cheatsheet', link: '/product/en/iap-cheatsheet.html' },
                { text: 'FAQ', link: '/product/en/faq.html' },
              ],
            },
          ],
          '/product/en/llm-prompt/': [
            { text: 'AI Entry', items: [{ text: 'llm-prompt', link: '/product/en/llm-prompt.html' }] },
          ],
        },
      },
    },
  },

  themeConfig: {
    siteTitle: 'OpenXenon',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/istuen/openxenon' }],
    footer: {
      message: 'OpenXenon · 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
      copyright: `MIT License · ${new Date().getFullYear()}`,
    },
  },
})
