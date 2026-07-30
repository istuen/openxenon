#!/bin/bash
# =============================================================================
# oxn-switch.sh — 在 Dev Version 与 Release Version 之间切换 OXN CLI 全局链接
#
# 阶段 1（2026-07-30）：包管理切 pnpm，构建/测试保留 bun
#   - Dev Version     = `npm link`（仓库 dist/cli.js → 当前 node 全局 bin）
#   - Release Version = `npm install -g`（本地 tarball 优先，registry 兜底）
#   - 串行切换：一次只一个 oxn 生效（PATH 互斥）
#   - 当前活动 node 是 homebrew node（/opt/homebrew）；未来切 nvm 需改脚本
#
# 详见 .openxenon/drafts/oxn-dev-release-coexistence.md
#
# 用法：
#   pnpm oxn:dev      # 切换到本地开发版
#   pnpm oxn:prod     # 切换到正式安装版（本地 tarball 优先，registry 兜底）
#   pnpm oxn:status   # 查看当前 oxn 指向
#
# Skill-store 规则（Step 4）：
#   - skills 是版本绑定的（build 时内联），dev 与 release 版本的 skills 不同
#   - 双版本切换后必须重跑 `oxn init` 让项目 skills 与当前版本对齐
#   - 保持 skills project-scoped（./.opencode/skills/，v0.6.2 默认）
#   - 不要用 `oxn install-skill --global` 写入 ~/.opencode/skills/，
#     否则 dev/prod 互踩
# =============================================================================

set -e

CLI_PKG_NAME="@istuen/openxenon"
MONOREPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

# 清理所有可能的全局 oxn 安装（npm 全局 + pnpm 全局 + homebrew bin 残留）
remove_global_oxn() {
  npm uninstall -g "$CLI_PKG_NAME" 2>/dev/null || true
  pnpm remove --global "$CLI_PKG_NAME" 2>/dev/null || true
  # homebrew 的 bin 可能是 npm link 残留（符号链接已悬空或指向 node_modules）
  if [ -L /opt/homebrew/bin/oxn ]; then
    rm -f /opt/homebrew/bin/oxn
  fi
  # pnpm-global bin 中的 wrapper shim
  rm -f /Users/issac/.pnpm-global/bin/oxn 2>/dev/null || true
}

print_status() {
  echo ""
  echo "当前 oxn 解析路径："
  which oxn 2>/dev/null || echo "未找到 oxn"
  oxn --version 2>/dev/null || true
}

# ────────────────────────────────────────────────────────────────────────────
# Modes
# ────────────────────────────────────────────────────────────────────────────

case "$1" in
  dev)
    echo "🔧 切换到本地开发版（Dev Version）..."

    # 1. 清理任何残留的全局安装
    remove_global_oxn

    # 2. 构建本地包（确保 dist 最新；通过 pnpm run build 抽象，未来换 tsup 不动此处）
    cd "$MONOREPO_ROOT"
    pnpm run build

    # 3. 链接到当前 node 全局（npm link；homebrew node 全局）
    npm link

    echo ""
    echo "✅ oxn 已指向本地构建："
    print_status
    echo ""
    echo "💡 提示：Dev Version 改源码后需 pnpm run build 重建 dist 才生效。"
    echo "   双版本切换后重跑 \`oxn init\` 让项目 skills 与当前版本对齐（Skill-store 规则）。"
    ;;

  prod)
    echo "📦 切换到正式安装版（Release Version）..."

    # 1. 移除本地全局链接
    cd "$MONOREPO_ROOT"
    npm unlink 2>/dev/null || true
    remove_global_oxn

    # 2. 优先本地 tarball（npm pack 产物，与未来 npm 发版同质）；回退 registry
    TARBALL=$(ls "$MONOREPO_ROOT"/istuen-openxenon-*.tgz 2>/dev/null | head -1 || true)
    if [ -n "$TARBALL" ]; then
      echo "  → 使用本地 tarball: $TARBALL"
      npm install -g "$TARBALL"
    else
      echo "  → 未找到本地 tarball；使用 registry: $CLI_PKG_NAME"
      npm install -g "$CLI_PKG_NAME"
    fi

    echo ""
    echo "✅ oxn 已恢复为正式版："
    print_status
    echo ""
    echo "💡 提示：Release Version 是不可变基线，bug 复原追踪必须带版本号。"
    echo "   双版本切换后重跑 \`oxn init\` 让项目 skills 与当前版本对齐（Skill-store 规则）。"
    ;;

  status)
    print_status
    echo ""
    echo "包管理器：pnpm $(pnpm --version 2>/dev/null || echo '未安装')"
    echo "构建/测试运行器：bun $(bun --version 2>/dev/null || echo '未安装')"
    echo "当前 node：$(node --version 2>/dev/null || echo '未安装') @ $(npm prefix -g 2>/dev/null)"
    ;;

  *)
    echo "用法: oxn-switch {dev|prod|status}"
    echo ""
    echo "  pnpm oxn:dev      切换到本地开发版（npm link → 仓库 dist/cli.js）"
    echo "  pnpm oxn:prod     切换到正式安装版（npm install -g，本地 tarball 或 registry）"
    echo "  pnpm oxn:status   查看当前 oxn 指向"
    exit 1
    ;;
esac