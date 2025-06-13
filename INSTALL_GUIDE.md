# 剪贴板管理器 - 安装指南

## 📥 下载安装

### 1. 下载应用

访问 [GitHub Releases](https://github.com/XianJunYe/clipboard-manager/releases) 页面，下载最新版本：

- **Apple Silicon Mac (M1/M2/M3)**：下载 `ClipboardManager-x.x.x-arm64.dmg`
- **Intel Mac**：下载 `ClipboardManager-x.x.x-x64.dmg`

### 2. 安装应用

1. 双击下载的 DMG 文件
2. 将 ClipboardManager 拖拽到 Applications 文件夹
3. 关闭安装窗口

## ⚠️ 解决 macOS 安全警告

由于应用未经过 Apple 公证，首次运行时会出现安全警告：

![安全警告](https://user-images.githubusercontent.com/86604910/xxx/security-warning.png)

**不用担心，这是正常现象！** 以下是解决方法：

### 方法一：通过系统偏好设置（推荐）

1. **关闭安全警告对话框**（点击"完成"或"移到废纸篓"）

2. **打开系统偏好设置**
   - 点击苹果菜单 > 系统偏好设置
   - 选择"安全性与隐私"
   - 点击"通用"标签页

3. **允许应用运行**
   - 在底部会看到类似这样的提示：
     > "已阻止使用 ClipboardManager，因为来自身份不明的开发者"
   - 点击 **"仍要打开"** 按钮
   - 在弹出的确认对话框中点击 **"打开"**

### 方法二：右键打开

1. **找到应用**
   - 打开 Finder
   - 进入 Applications 文件夹
   - 找到 ClipboardManager.app

2. **右键打开**
   - 右键点击 ClipboardManager.app
   - 选择 **"打开"**
   - 在弹出的对话框中点击 **"打开"**

### 方法三：使用终端命令（高级用户）

```bash
# 移除应用的隔离属性
sudo xattr -rd com.apple.quarantine /Applications/ClipboardManager.app
```

## 🚀 首次使用

### 1. 启动应用

成功打开应用后，你会看到：
- 系统托盘中出现剪贴板管理器图标
- 可能会弹出权限请求对话框

### 2. 授权辅助功能权限

应用需要辅助功能权限来监听剪贴板变化：

1. **系统偏好设置** > **安全性与隐私** > **隐私**
2. 选择左侧的 **"辅助功能"**
3. 点击左下角的 **锁图标** 并输入密码
4. 勾选 **ClipboardManager** 或点击 **"+"** 添加应用
5. 重启应用使权限生效

### 3. 开始使用

- **复制内容**：正常使用 Command+C
- **查看历史**：按 Command+Shift+V
- **快速选择**：按数字键 1-9
- **托盘菜单**：右键点击托盘图标

## 🔄 自动更新

应用内置自动更新功能：

1. **检查更新**：点击托盘菜单中的"🔍 检查更新"
2. **自动下载**：发现新版本后会自动下载
3. **一键安装**：下载完成后点击"🔄 重启并更新"

## ❓ 常见问题

### Q: 为什么会出现安全警告？
A: 因为应用没有经过 Apple 的公证程序。这需要付费的开发者账户，但不影响应用的安全性和功能。

### Q: 应用安全吗？
A: 完全安全！应用是开源的，你可以在 [GitHub](https://github.com/XianJunYe/clipboard-manager) 查看所有源代码。

### Q: 如何卸载应用？
A: 
1. 右键点击托盘图标，选择"退出"
2. 将 `/Applications/ClipboardManager.app` 移到废纸篓
3. 清理配置文件（可选）：`~/Library/Application Support/clipboard-manager`

### Q: 应用无法启动怎么办？
A: 
1. 确保已按照上述方法解决安全警告
2. 检查是否授权了辅助功能权限
3. 尝试重启 Mac
4. 如果问题持续，请在 GitHub 提交 Issue

### Q: 快捷键不工作？
A: 
1. 确保已授权辅助功能权限
2. 检查是否有其他应用占用了相同快捷键
3. 重启应用

## 📞 获取帮助

如果遇到问题：

1. **查看文档**：[README.md](README.md)
2. **提交 Issue**：[GitHub Issues](https://github.com/XianJunYe/clipboard-manager/issues)
3. **查看源码**：[GitHub Repository](https://github.com/XianJunYe/clipboard-manager)

## 🎉 享受使用！

安装完成后，你就可以享受强大的剪贴板管理功能了！

- ⚡ 快速访问历史记录
- 🔢 数字键快速选择
- 🖼️ 支持文本和图片
- �� 搜索历史内容
- 🔄 自动更新功能 