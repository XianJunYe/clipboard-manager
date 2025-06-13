# 故障排除指南

## macOS "Unable to find helper app" 错误

### 问题描述
使用 `electron-builder` 构建的应用在 macOS 上启动时出现以下错误：
```
[FATAL:electron_main_delegate_mac.mm(68)] Unable to find helper app
```

### 问题原因
这是 `electron-builder` 在某些配置下的已知问题，特别是在 Electron 22.x 版本中。Helper 应用虽然存在于应用包中，但主应用无法正确找到它们。

### 解决方案
使用 `electron-packager` 替代 `electron-builder` 进行应用打包：

1. **安装 electron-packager**：
   ```bash
   npm install --save-dev electron-packager
   ```

2. **使用 electron-packager 构建**：
   ```bash
   npm run build-packager
   ```

3. **创建 DMG 安装包**：
   ```bash
   npm run create-dmg
   ```

4. **一键构建发布版本**：
   ```bash
   npm run build-release
   ```

### 验证解决方案
构建完成后，可以通过以下方式验证：

1. **直接运行应用**：
   ```bash
   open dist-packager/ClipboardManager-darwin-arm64/ClipboardManager.app
   ```

2. **检查进程**：
   ```bash
   ps aux | grep -i clipboard
   ```
   应该能看到主进程和各种 Helper 进程正在运行。

### 技术细节
- `electron-packager` 能正确处理 Helper 应用的配置和路径
- `electron-builder` 在某些情况下会生成不正确的 Helper 应用配置
- 问题与代码签名、应用 ID 或依赖无关，纯粹是构建工具的问题

### 相关文件
- `package.json` - 包含新的构建脚本
- `src/main-simple.js` - 简化版主文件（移除了可能有问题的依赖）

### 版本历史
- v1.0.3: 首次发现问题
- v1.0.4: 尝试添加 helperBundleId 配置
- v1.0.5: 降级 Electron 版本
- v1.0.6: 使用 electron-packager 解决问题 