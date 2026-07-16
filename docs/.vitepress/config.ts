import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenXenon',
  description: '轻量级人机协作工具 — 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
  cleanUrls: false,
  base: '/openxenon/',
  lastUpdated: true,

  // v0.3 PR-C：注入自定义 CSS（5 类 H1 顶部色条 + 11 类 H2 左边框 + 浅色背景）
  head: [['link', { rel: 'stylesheet', href: '/.vitepress/theme/custom.css' }]],

  // 站点结构（VitePress 对称 prefix i18n 模式）：
  //   docs/zh-cn/index.md              → /openxenon/zh-cn/           （门户页）
  //   docs/zh-cn/product/*.md          → /openxenon/zh-cn/product/   （产品手册）
  //   docs/zh-cn/dev/*.md              → /openxenon/zh-cn/dev/       （开发手册）
  //   docs/en/*.md                     → /openxenon/en/              （英文站，本轮不动）
  // 旧 SSOT 子目录（core/architecture/reference/...）在 srcExclude 排除
  srcDir: '.',
  srcExclude: ['core/**', 'architecture/**', 'reference/**', 'guides/**', 'design/**', 'horizon/**', '_archive/**'],

  markdown: {
    config: (md) => {
      return md
    },
  },

  // 忽略死链规则（旧 docs/{core,architecture,reference,...} 子目录 + .openxenon/ 跳出链接）
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
    /^\.\/zh-cn\/llm-prompt/, // redirectFrom 旧路径误报
    // v0.6 RFC links 跳出 srcDir (docs/) 指向仓库根 .openxenon/ — pre-existing pattern, accept
    /\.\.+\/\.openxenon\//, // 匹配任意 ../ 数量的 .openxenon/ 链接
    // pools/ 中的 RFC 路径（历史路径，部分 RFC 已迁到 rfcs/）
    /\.\.+\/\.openxenon\/pools\/sprints\//,
    // dev/ 文件引用 AGENTS.md（路径正确但 VitePress 误报）
    /\.\.+\/AGENTS/,
    // EN 站点文件引用（本轮未重构 EN，预存在死链）
    /\/en\//,
    // dev/extending 路径误报
    /\.\.+\/dev\/extending/,
    // EN 站点文件所有死链（本轮未重构 EN，全部忽略）
    // ./.openxenon/docs/adrs/ 路径（EN 文件引用 ADR）
    /^\.\/\.openxenon\/docs\/adrs\//,
    // ./domain ./workflow ./stack ./roadmap（EN asset-templates 引用）
    /^\.\/(domain|workflow|stack|roadmap)$/,
  ],

  // VitePress 标准 i18n：两个 locale 都用 prefix（对称结构，天然支持同页切换）
  // - zh-CN: 中文站，目录 docs/zh-cn/，URL prefix /zh-cn/
  // - en:    英文站，目录 docs/en/，URL prefix /en/
  locales: {
    'zh-cn': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-cn/',
      title: 'OpenXenon · 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
      description: '轻量级人机协作工具 — 工程师信任 AI Agent 在边界内的执行成果',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh-cn/' },
          { text: '产品手册', link: '/zh-cn/product/' },
          { text: '开发手册', link: '/zh-cn/dev/' },
          { text: '快速开始', link: '/zh-cn/product/quickstart.html' },
          { text: 'AI 入口', link: '/zh-cn/product/ai-entry.html' },
        ],
        sidebar: {
          '/zh-cn/product/': [
            {
              text: '介绍与开始',
              items: [
                { text: '产品手册首页', link: '/zh-cn/product/' },
                { text: '介绍', link: '/zh-cn/product/introduction.html' },
                { text: '快速开始', link: '/zh-cn/product/quickstart.html' },
                { text: 'AI 协作者入口', link: '/zh-cn/product/ai-entry.html' },
                { text: '常见问题', link: '/zh-cn/product/faq.html' },
                { text: '路线图', link: '/zh-cn/product/roadmap.html' },
              ],
            },
            {
              text: '范式与实体（E1-E4）',
              items: [
                { text: 'IAP 范式与信任链', link: '/zh-cn/product/concepts/iap-paradigm.html' },
                { text: 'Asset · E1', link: '/zh-cn/product/concepts/asset.html' },
                { text: 'Work · E2', link: '/zh-cn/product/concepts/work.html' },
                { text: 'Proof · E3', link: '/zh-cn/product/concepts/proof.html' },
                { text: 'Insight · E4', link: '/zh-cn/product/concepts/insight.html' },
                { text: 'Asset Paper', link: '/zh-cn/product/concepts/asset-paper.html' },
              ],
            },
            {
              text: '实战',
              items: [
                { text: '实战案例', link: '/zh-cn/product/practice/recipes.html' },
                { text: 'DDD 实战', link: '/zh-cn/product/practice/ddd-in-practice.html' },
                { text: '端到端示例', link: '/zh-cn/product/practice/examples/' },
              ],
            },
            {
              text: '用户参考',
              items: [
                { text: 'CLI 用户指南', link: '/zh-cn/product/reference/cli-user-guide.html' },
                { text: '术语表', link: '/zh-cn/product/reference/glossary.html' },
                { text: 'IAP 速记卡', link: '/zh-cn/product/reference/iap-cheatsheet.html' },
                { text: 'Asset 模板库', link: '/zh-cn/product/reference/asset-templates/' },
              ],
            },
          ],
          '/zh-cn/dev/': [
            {
              text: '开发总览',
              items: [
                { text: '开发手册首页', link: '/zh-cn/dev/' },
                { text: '入门（环境+仓库）', link: '/zh-cn/dev/getting-started.html' },
                { text: '架构总览', link: '/zh-cn/dev/architecture.html' },
                { text: 'Monorepo 双包', link: '/zh-cn/dev/monorepo.html' },
                { text: 'L0-L3 宪法', link: '/zh-cn/dev/l0-l3-constitution.html' },
              ],
            },
            {
              text: '概念与机制',
              items: [
                { text: '三层文档守门', link: '/zh-cn/dev/three-tier-docs.html' },
                { text: 'AI 协作工作流', link: '/zh-cn/dev/ai-collaboration.html' },
              ],
            },
            {
              text: '扩展点',
              items: [
                { text: '扩展总览', link: '/zh-cn/dev/extending/' },
                { text: '自定义 Probe', link: '/zh-cn/dev/extending/custom-probe.html' },
                { text: '自定义 Part', link: '/zh-cn/dev/extending/custom-part.html' },
                { text: 'DSL 扩展', link: '/zh-cn/dev/extending/dsl-extension.html' },
                { text: 'Skill 编写', link: '/zh-cn/dev/extending/skill-authoring.html' },
              ],
            },
            {
              text: '工程实践',
              items: [
                { text: '测试策略', link: '/zh-cn/dev/testing.html' },
                { text: '发布流程', link: '/zh-cn/dev/releasing.html' },
                { text: '调试指南', link: '/zh-cn/dev/debugging.html' },
                { text: '代码规范', link: '/zh-cn/dev/conventions.html' },
              ],
            },
          ],
          // 旧 /zh-cn/ 路径的 sidebar 保留为空（redirectFrom 处理重定向）
          '/zh-cn/': [],
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'OpenXenon · Engineers define intent, AI Agents run alignment, OXN Engine emits proof',
      description: 'Lightweight human–AI collaboration tool — engineers trust AI Agents within boundaries',
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
      message: 'OpenXenon · 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明',
      copyright: `MIT License · ${new Date().getFullYear()}`,
    },
  },
})
