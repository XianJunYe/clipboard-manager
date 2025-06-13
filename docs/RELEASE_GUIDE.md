# 剪贴板管理器 - 发布指南

本文档详细说明了如何发布新版本的剪贴板管理器，包括构建、发布和自动更新的完整流程。

## 🚀 快速发布流程

### 1. 准备发布

```bash
# 1. 确保代码已提交到 main 分支
git add .
git commit -m "feat: 准备发布 v1.0.x"
git push origin main

# 2. 更新版本号
# 手动编辑 package.json 中的 version 字段
# 或使用以下命令自动更新：
npm version patch  # 补丁版本 1.0.0 -> 1.0.1
npm version minor  # 次要版本 1.0.0 -> 1.1.0  
npm version major  # 主要版本 1.0.0 -> 2.0.0
```

### 2. 构建和发布

```bash
# 方式一：直接发布（推荐）
npm run publish

# 方式二：先创建草稿，再手动发布
npm run draft
# 然后使用下面的脚本发布
```

### 3. 发布草稿版本

如果使用 `npm run draft`，需要手动发布：

```bash
# 获取最新 release ID
RELEASE_ID=$(curl -s -H "Authorization: token $GH_TOKEN" \
  https://api.github.com/repos/XianJunYe/clipboard-manager/releases | \
  jq -r '.[0].id')

echo "Release ID: $RELEASE_ID"

# 发布 release
curl -X PATCH \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft": false}' \
  https://api.github.com/repos/XianJunYe/clipboard-manager/releases/$RELEASE_ID
```

## 🔧 环境配置

### GitHub Token 配置

1. 访问 GitHub Settings > Developer settings > Personal access tokens
2. 生成新的 token，勾选 `repo` 权限
3. 设置环境变量：

```bash
# 临时设置（当前会话有效）
export GH_TOKEN=your_github_token_here

# 永久设置（添加到 ~/.zshrc 或 ~/.bash_profile）
echo 'export GH_TOKEN=your_github_token_here' >> ~/.zshrc
source ~/.zshrc
```

### 开发环境测试配置

创建 `dev-app-update.yml` 文件用于开发环境测试更新：

```yaml
owner: XianJunYe
repo: clipboard-manager
provider: github
```

## 📦 构建配置说明

### package.json 配置

```json
{
  "build": {
    "appId": "com.xianjun.clipboard-manager",
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
      "owner": "XianJunYe",
      "repo": "clipboard-manager"
    }
  },
  "scripts": {
    "build": "electron-builder",
    "draft": "electron-builder --publish=onTagOrDraft",
    "publish": "electron-builder --publish=always"
  }
}
```

### 构建产物说明

每次构建会生成以下文件：

- `ClipboardManager-x.x.x-x64.dmg` - Intel Mac 安装包
- `ClipboardManager-x.x.x-arm64.dmg` - Apple Silicon Mac 安装包  
- `ClipboardManager-x.x.x-x64.zip` - Intel Mac 更新包
- `ClipboardManager-x.x.x-arm64.zip` - Apple Silicon Mac 更新包
- `latest-mac.yml` - 更新信息文件
- `*.blockmap` - 增量更新文件

## 🔄 自动更新机制

### 更新检测流程

1. 用户点击托盘菜单"🔍 检查更新"
2. 应用请求 GitHub API 检查最新版本
3. 如果有新版本，自动下载对应架构的 ZIP 文件
4. 下载完成后，托盘菜单显示"🔄 重启并更新"
5. 用户点击后应用重启并安装更新

### 更新相关代码

主要更新逻辑在 `src/main.js` 中：

```javascript
// 手动检查更新
async function manualCheckForUpdates() {
  try {
    console.log('开始手动检查更新...');
    const result = await autoUpdater.checkForUpdatesAndNotify();
    // ... 处理逻辑
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

// 更新事件监听
autoUpdater.on('update-available', (info) => {
  console.log('发现新版本:', info.version);
  updateTrayMenu('正在下载更新...');
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('更新下载完成:', info.version);
  updateTrayMenuWithUpdate();
});
```

## 🐛 故障排除

### 常见问题

1. **"No published versions on GitHub"**
   - 原因：Release 处于草稿状态
   - 解决：使用 API 将草稿发布为正式版本

2. **"Apple timestamp server is not available"**
   - 原因：Apple 时间戳服务不可用
   - 解决：在构建配置中添加 `"timestamp": false`

3. **更新检测失败**
   - 检查网络连接
   - 确认 GitHub Token 权限
   - 查看控制台日志

4. **构建失败**
   - 检查 Node.js 版本兼容性
   - 清理 node_modules 重新安装
   - 检查 electron-builder 配置

5. **macOS 安全警告 "无法验证开发者"**
   - 原因：应用未经过 Apple 公证
   - 解决方法：
     - **方法一**：系统偏好设置 > 安全性与隐私 > 通用 > 点击"仍要打开"
     - **方法二**：右键点击应用 > 选择"打开" > 确认"打开"
     - **方法三**：终端执行 `sudo xattr -rd com.apple.quarantine /Applications/ClipboardManager.app`

### 调试命令

```bash
# 查看构建详细日志
DEBUG=electron-builder npm run build

# 检查 GitHub API
curl -H "Authorization: token $GH_TOKEN" \
  https://api.github.com/repos/XianJunYe/clipboard-manager/releases

# 测试更新检测
npm run dev
# 然后在应用中点击"检查更新"
```

## 📋 发布检查清单

发布前请确认：

- [ ] 代码已提交并推送到 main 分支
- [ ] 版本号已更新（package.json）
- [ ] GitHub Token 已配置且有效
- [ ] 构建配置正确（appId, productName 等）
- [ ] 测试了主要功能是否正常
- [ ] 更新日志已准备（可选）

发布后请验证：

- [ ] GitHub Releases 页面显示新版本
- [ ] 下载链接可用
- [ ] DMG 和 ZIP 文件都已上传
- [ ] latest-mac.yml 文件存在
- [ ] 在旧版本中测试更新功能

## 🔗 相关链接

- [GitHub Releases](https://github.com/XianJunYe/clipboard-manager/releases)
- [electron-builder 文档](https://www.electron.build/)
- [electron-updater 文档](https://www.electron.build/auto-update)
- [GitHub API 文档](https://docs.github.com/en/rest/releases)

## 📝 版本历史

- v1.0.4 - 修复 "Unable to find helper app" 错误，添加 helperBundleId 配置
- v1.0.3 - 移除自动检查更新，保留手动更新功能
- v1.0.2 - 完善自动更新功能，添加进度显示
- v1.0.1 - 修复更新检测问题
- v1.0.0 - 初始版本，基础剪贴板管理功能 