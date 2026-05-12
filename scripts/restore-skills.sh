#!/bin/bash
set -e

echo "=== 恢复 Skills 目录 ==="

if [ -d ".opencode/skills.bak" ]; then
    rm -rf .opencode/skills
    cp -r .opencode/skills.bak .opencode/skills
    echo "✓ 已恢复到备份: .opencode/skills.bak/ → .opencode/skills/"
else
    echo "✗ 错误：未找到备份目录 .opencode/skills.bak/"
    exit 1
fi

echo ""
echo "当前 .opencode/skills/ 结构："
find .opencode/skills -type f | sort