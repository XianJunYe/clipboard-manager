# 剪贴板管理器

一个强大的 macOS 剪贴板管理工具，可以替换系统默认的 Command+C 和 Command+V 快捷键，提供历史记录和快速选择功能。

## 功能特点

- 🚀 **智能快捷键**: Command+Shift+V 打开选择窗口，不影响系统原生快捷键
- 📋 **智能历史**: 自动保存最近 50 条复制内容
- ⚡ **快速选择**: 数字键 1-9 快速选择，0 键查看更多
- 🖼️ **多媒体支持**: 支持文本和图片内容
- 💾 **持久化存储**: 重启后保留历史记录
- 🎯 **系统托盘**: 后台运行，完全不干扰系统快捷键
- 🔍 **搜索功能**: 在详细窗口中搜索历史内容

## 安装和运行

### 用户安装

如果你是普通用户，想要直接使用应用：

📥 **[查看详细安装指南](INSTALL_GUIDE.md)**

- 下载最新版本的 DMG 文件
- 解决 macOS 安全警告
- 配置权限和首次使用

### 开发者运行

如果你是开发者，想要从源码运行：

#### 1. 安装依赖
```bash
npm install
```

#### 2. 运行应用
```bash
npm start
```

#### 3. 开发模式
```bash
npm run dev
```

## 使用方法

### 基本操作
1. **复制内容**: 正常使用 Command+C 复制，内容会自动保存到历史记录
2. **选择历史**: 按 Command+Shift+V 显示历史选择窗口  
3. **快速选择**: 按数字键 1-9 快速选择对应内容
4. **执行粘贴**: 选择后使用正常的 Command+V 粘贴内容
5. **查看更多**: 按数字键 0 打开详细窗口查看所有记录
6. **关闭窗口**: 按 ESC 或点击其他地方关闭选择窗口

### 详细窗口功能
- **搜索内容**: 使用顶部搜索框快速查找内容
- **点击粘贴**: 点击任意记录即可复制到剪贴板
- **展开/收起**: 长文本可以展开查看完整内容

### 系统托盘
- 右键托盘图标可以：
  - 显示剪贴板历史
  - 清空历史记录
  - 退出应用（自动恢复系统快捷键）

## 技术实现

- **框架**: Electron
- **数据存储**: electron-store
- **全局快捷键**: electron globalShortcut
- **系统集成**: macOS AppleScript

## 注意事项

- 首次运行可能需要授权辅助功能权限
- 退出应用时会自动恢复系统原有的快捷键
- 图片内容会以 Base64 格式存储

## 发布流程

### 环境准备

1. **安装发布依赖**
```bash
npm install --save-dev electron-builder
npm install --save electron-updater
```

2. **配置 GitHub Token**
```bash
# 在 GitHub 生成 Personal Access Token (需要 repo 权限)
export GH_TOKEN=your_github_token_here
```

3. **配置 package.json**
```json
{
  "build": {
    "appId": "com.yourname.clipboard-manager",
    "productName": "ClipboardManager",
    "directories": {
      "output": "dist"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "timestamp": false
    },
    "publish": {
      "provider": "github",
      "owner": "YourGitHubUsername",
      "repo": "clipboard-manager"
    }
  }
}
```

### 发布步骤

1. **更新版本号**
```bash
# 手动编辑 package.json 中的 version 字段
# 或使用 npm version 命令
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

2. **构建并发布**
```bash
# 构建并发布到 GitHub Releases
npm run publish

# 或者分步执行
npm run build      # 仅构建
npm run draft      # 构建并创建草稿版本
```

3. **发布 Release**
```bash
# 获取最新 release ID
curl -H "Authorization: token $GH_TOKEN" \
  https://api.github.com/repos/YourUsername/clipboard-manager/releases | \
  jq '.[] | select(.tag_name == "v1.0.x") | .id'

# 发布 release (将草稿改为正式版本)
curl -X PATCH \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft": false}' \
  https://api.github.com/repos/YourUsername/clipboard-manager/releases/RELEASE_ID
```

### 自动更新配置

应用内已集成 `electron-updater`，支持以下功能：

- **手动检查更新**: 通过系统托盘菜单"🔍 检查更新"
- **自动下载**: 发现新版本后自动下载 ZIP 文件
- **一键安装**: 下载完成后托盘菜单显示"🔄 重启并更新"选项

### 开发模式测试更新

创建 `dev-app-update.yml` 文件用于开发环境测试：
```yaml
owner: YourGitHubUsername
repo: clipboard-manager
provider: github
```

### 发布脚本说明

- `npm run build`: 仅构建应用，不发布
- `npm run draft`: 构建并创建 GitHub 草稿版本
- `npm run publish`: 构建并直接发布到 GitHub Releases

### 注意事项

1. **文件格式**: macOS 自动更新需要 ZIP 格式，DMG 仅用于手动安装
2. **代码签名**: 需要 Apple 开发者证书进行代码签名
3. **版本管理**: 确保每次发布都增加版本号
4. **测试流程**: 建议先发布草稿版本进行测试

## 开发计划

- [ ] 支持更多文件类型
- [ ] 添加快捷键自定义
- [ ] 支持云同步
- [ ] 优化界面和交互体验 