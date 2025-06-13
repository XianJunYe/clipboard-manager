#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
REPO_OWNER="XianJunYe"
REPO_NAME="clipboard-manager"
VERSION="v1.0.6"
DMG_FILE="dist-release/ClipboardManager 1.0.6.dmg"

echo -e "${BLUE}🚀 开始创建 GitHub Release ${VERSION}${NC}"

# 检查 DMG 文件是否存在
if [ ! -f "$DMG_FILE" ]; then
    echo -e "${RED}❌ 错误: DMG 文件不存在: $DMG_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 找到 DMG 文件: $DMG_FILE${NC}"

# 创建 Release 的 JSON 数据
RELEASE_DATA=$(cat <<EOF
{
  "tag_name": "$VERSION",
  "target_commitish": "main",
  "name": "$VERSION - 修复 macOS 启动问题",
  "body": "## 🎉 重要修复\n\n### ✅ 已修复问题\n- **修复了 macOS 上的 'Unable to find helper app' 启动错误**\n- 应用现在可以在 macOS 上正常启动和运行\n\n### 🔧 技术改进\n- 使用 \`electron-packager\` 替代 \`electron-builder\` 进行应用打包\n- 添加简化版主文件，移除可能有问题的依赖\n- 优化构建流程，确保 Helper 应用正确配置\n\n### 📦 安装说明\n1. 下载 \`ClipboardManager 1.0.6.dmg\`\n2. 双击打开 DMG 文件\n3. 将应用拖拽到 Applications 文件夹\n4. 首次运行时，右键点击应用选择「打开」以绕过安全警告\n\n### 🚀 功能特性\n- ✅ 系统托盘集成\n- ✅ 全局快捷键 (Cmd+Shift+V)\n- ✅ 剪贴板历史记录\n- ✅ 文本和图片支持\n- ✅ 自动去重和清理\n\n### 💻 系统要求\n- macOS 10.13 或更高版本\n- Apple Silicon (M1/M2/M3) Mac\n\n如果遇到问题，请查看项目中的 TROUBLESHOOTING.md 文件。",
  "draft": false,
  "prerelease": false
}
EOF
)

echo -e "${YELLOW}🔧 创建 GitHub Release...${NC}"

# 检查 GitHub Token (支持 GITHUB_TOKEN 或 GH_TOKEN)
TOKEN=${GITHUB_TOKEN:-$GH_TOKEN}
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 错误: 请设置 GITHUB_TOKEN 或 GH_TOKEN 环境变量${NC}"
    echo -e "${YELLOW}💡 提示: 请在 GitHub 设置中创建 Personal Access Token 并设置环境变量${NC}"
    echo -e "${YELLOW}   export GITHUB_TOKEN=your_token_here${NC}"
    exit 1
fi

# 创建 Release
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "$RELEASE_DATA" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases")

# 检查是否创建成功
RELEASE_ID=$(echo "$RESPONSE" | grep -o '"id": [0-9]*' | head -1 | cut -d' ' -f2)

if [ -z "$RELEASE_ID" ]; then
    echo -e "${RED}❌ 创建 Release 失败${NC}"
    echo "$RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Release 创建成功! ID: $RELEASE_ID${NC}"

# 上传 DMG 文件
echo -e "${YELLOW}📤 上传 DMG 文件...${NC}"

UPLOAD_URL="https://uploads.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/$RELEASE_ID/assets?name=ClipboardManager-1.0.6.dmg"

UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$DMG_FILE" \
  "$UPLOAD_URL")

# 检查上传是否成功
ASSET_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id": [0-9]*' | head -1 | cut -d' ' -f2)

if [ -z "$ASSET_ID" ]; then
    echo -e "${RED}❌ 上传 DMG 文件失败${NC}"
    echo "$UPLOAD_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ DMG 文件上传成功! Asset ID: $ASSET_ID${NC}"
echo -e "${GREEN}🎉 Release $VERSION 创建完成!${NC}"
echo -e "${BLUE}🔗 查看 Release: https://github.com/$REPO_OWNER/$REPO_NAME/releases/tag/$VERSION${NC}" 