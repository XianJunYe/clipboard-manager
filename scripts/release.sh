#!/bin/bash

# 剪贴板管理器自动发布脚本
# 使用方法: ./scripts/release.sh [patch|minor|major]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查参数
VERSION_TYPE=${1:-patch}
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    print_error "无效的版本类型: $VERSION_TYPE"
    echo "使用方法: $0 [patch|minor|major]"
    exit 1
fi

print_info "开始发布流程，版本类型: $VERSION_TYPE"

# 检查 GitHub Token
if [ -z "$GH_TOKEN" ]; then
    print_error "未设置 GH_TOKEN 环境变量"
    echo "请先设置 GitHub Token:"
    echo "export GH_TOKEN=your_github_token_here"
    exit 1
fi

# 检查工作目录是否干净
if [ -n "$(git status --porcelain)" ]; then
    print_warning "工作目录有未提交的更改"
    echo "是否继续? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "已取消发布"
        exit 0
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "当前版本: $CURRENT_VERSION"

# 更新版本号
print_info "更新版本号..."
npm version $VERSION_TYPE --no-git-tag-version

# 获取新版本
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "新版本: $NEW_VERSION"

# 提交版本更改
print_info "提交版本更改..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# 推送到远程仓库
print_info "推送到远程仓库..."
git push origin main

# 构建并发布
print_info "开始构建和发布..."
npm run publish

# 等待构建完成
print_info "等待构建完成..."
sleep 5

# 获取最新 release ID 并发布
print_info "发布 GitHub Release..."
RELEASE_ID=$(curl -s -H "Authorization: token $GH_TOKEN" \
    https://api.github.com/repos/XianJunYe/clipboard-manager/releases | \
    jq -r ".[0].id")

if [ "$RELEASE_ID" = "null" ] || [ -z "$RELEASE_ID" ]; then
    print_error "无法获取 Release ID"
    exit 1
fi

print_info "Release ID: $RELEASE_ID"

# 发布 release
RESPONSE=$(curl -s -X PATCH \
    -H "Authorization: token $GH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"draft": false}' \
    https://api.github.com/repos/XianJunYe/clipboard-manager/releases/$RELEASE_ID)

# 检查发布结果
if echo "$RESPONSE" | jq -e '.published_at' > /dev/null; then
    print_success "版本 $NEW_VERSION 发布成功！"
    echo ""
    print_info "发布信息:"
    echo "  - 版本: $NEW_VERSION"
    echo "  - 下载地址: https://github.com/XianJunYe/clipboard-manager/releases/tag/v$NEW_VERSION"
    echo "  - Release ID: $RELEASE_ID"
    echo ""
    print_info "接下来可以:"
    echo "  1. 下载并安装新版本进行测试"
    echo "  2. 在旧版本中测试自动更新功能"
    echo "  3. 更新发布说明（可选）"
else
    print_error "发布失败"
    echo "响应: $RESPONSE"
    exit 1
fi 