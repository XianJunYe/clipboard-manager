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

## 📚 文档

- 📥 **[安装指南](docs/INSTALL_GUIDE.md)** - 用户安装和配置说明
- 🚀 **[发布指南](docs/RELEASE_GUIDE.md)** - 开发者发布流程
- 🔧 **[故障排除](docs/TROUBLESHOOTING.md)** - 常见问题解决方案

## 安装和运行

### 用户安装

如果你是普通用户，想要直接使用应用：

📥 **[查看详细安装指南](docs/INSTALL_GUIDE.md)**

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
# 普通启动
npm start

# 安全启动（带重复检测提示和交互选项）
npm run start-safe

# 检查应用状态
npm run status

# 开发模式
npm run dev
```

#### 3. 单实例保护
应用内置智能单实例检测机制：
- 🚫 **防重复启动**：如果应用已在运行，新实例会自动退出
- 📋 **智能反馈**：显示详细的应用状态和使用说明
- 🔔 **系统通知**：重复启动时显示原生通知提醒
- 🖱️ **快速访问**：点击通知或使用快捷键显示剪贴板选择窗口
- 📊 **状态查询**：使用 `npm run status` 查看详细运行状态

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

## 开发者

### 构建和发布

详细的构建和发布流程请参考：📚 **[发布指南](docs/RELEASE_GUIDE.md)**

快速命令：
```bash
# 构建应用
npm run build-release

# 发布到 GitHub
./scripts/create-release.sh
```

## 开发计划

- [ ] 支持更多文件类型
- [ ] 添加快捷键自定义
- [ ] 支持云同步
- [ ] 优化界面和交互体验 