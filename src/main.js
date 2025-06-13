const { app, BrowserWindow, globalShortcut, Tray, Menu, clipboard, ipcMain, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');

class ClipboardManager {
  constructor() {
    this.store = new Store();
    this.mainWindow = null;
    this.quickSelectWindow = null;
    this.detailWindow = null;
    this.tray = null;
    this.clipboardHistory = this.store.get('clipboardHistory', []);
    this.lastClipboardContent = '';
    this.isQuickSelectVisible = false;
    this.previousApp = null;
    
    // 确保历史记录不超过50条
    if (this.clipboardHistory.length > 50) {
      this.clipboardHistory = this.clipboardHistory.slice(0, 50);
      this.store.set('clipboardHistory', this.clipboardHistory);
    }
  }

  init() {
    // 加载历史记录
    this.clipboardHistory = this.store.get('clipboardHistory', []);
    
    // 清理重复的历史记录
    this.deduplicateHistory();
    
    this.createTray();
    this.registerGlobalShortcuts();
    this.startClipboardWatcher();
    this.setupAutoUpdater();
    
    // 监听应用退出事件
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  deduplicateHistory() {
    const originalLength = this.clipboardHistory.length;
    const seen = new Set();
    
    this.clipboardHistory = this.clipboardHistory.filter(item => {
      let key;
      if (item.type === 'text') {
        // 文本类型：去除空格后比较
        key = `${item.type}:${item.content.trim()}`;
      } else {
        // 图片类型：直接比较内容
        key = `${item.type}:${item.content}`;
      }
      
      if (seen.has(key)) {
        return false; // 重复项，过滤掉
      }
      seen.add(key);
      return true;
    });
    
    const removedCount = originalLength - this.clipboardHistory.length;
    if (removedCount > 0) {
      console.log(`🧹 已清理 ${removedCount} 条重复的剪贴板记录`);
      // 保存清理后的历史记录
      this.store.set('clipboardHistory', this.clipboardHistory);
    }
    
    if (this.clipboardHistory.length > 0) {
      console.log(`📚 已加载 ${this.clipboardHistory.length} 条剪贴板历史记录`);
    }
  }

  createTray() {
    // 创建系统托盘图标
    const path = require('path');
    const { nativeImage } = require('electron');
    
    // 使用用户提供的图标文件
    const iconPath = path.join(__dirname, '../assets/a.png');
    
    try {
      // 尝试多种方法创建托盘图标
      let image = nativeImage.createFromPath(iconPath);
      
      // 如果图标为空，尝试调整大小
      if (image.isEmpty()) {
        console.log('图标为空，尝试使用nativeImage.createFromPath');
        image = nativeImage.createFromPath(iconPath);
      }
      
      // 调整图标大小为标准托盘尺寸
      if (!image.isEmpty()) {
        image = image.resize({ width: 16, height: 16 });
        // 设置为模板图像，这样系统会自动调整颜色
        image.setTemplateImage(true);
      }
      
      this.tray = new Tray(image);
      console.log('成功加载自定义图标:', iconPath);
      
      // 添加托盘图标调试信息
      console.log('托盘图标尺寸:', image.getSize());
      console.log('图标是否为空:', image.isEmpty());
      
    } catch (error) {
      console.log('加载自定义图标失败，使用备用方案:', error.message);
      
      // 备用方案：创建一个简单的文本图标
      try {
        // 使用系统默认的图标或创建一个简单图标
        const fs = require('fs');
        if (fs.existsSync(iconPath)) {
          // 文件存在，可能是格式问题，尝试强制加载
          const buffer = fs.readFileSync(iconPath);
          const image = nativeImage.createFromBuffer(buffer);
          image.setTemplateImage(true);
          this.tray = new Tray(image);
          console.log('使用buffer方式成功加载图标');
        } else {
          throw new Error('图标文件不存在');
        }
      } catch (fallbackError) {
        console.log('所有方法都失败，创建文本托盘图标');
        // 最后的备用方案：显示应用在dock（临时解决方案）
        if (process.platform === 'darwin') {
          app.dock.show();
          console.log('托盘创建失败，临时显示dock图标');
        }
        return; // 退出，不创建托盘
      }
    }
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示剪贴板历史',
        click: () => this.showQuickSelect()
      },
      { type: 'separator' },
      {
        label: '清理重复记录',
        click: () => {
          this.deduplicateHistory();
          console.log('✨ 手动去重完成');
        }
      },
      {
        label: '清空历史记录',
        click: () => this.clearHistory()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.cleanup();
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('剪贴板管理器 - Command+Shift+V');
    
    // 添加点击事件来测试托盘是否可交互
    this.tray.on('click', () => {
      console.log('托盘图标被点击！');
      this.showQuickSelect();
    });
    
    this.tray.on('right-click', () => {
      console.log('托盘图标被右键点击！');
    });
    
    // 检查托盘是否被成功创建
    if (this.tray && !this.tray.isDestroyed()) {
      console.log('✅ 系统托盘已成功创建并激活');
      console.log('💡 请检查macOS菜单栏右上角（WiFi、电池图标附近）');
      console.log('🔍 如果看不到图标，请尝试调整菜单栏显示设置');
    } else {
      console.log('❌ 系统托盘创建失败');
    }
  }



  registerGlobalShortcuts() {
    // 注册 Command+Shift+V 组合键来打开选择窗口（类似很多应用的特殊粘贴功能）
    const selectShortcut = process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V';
    
    globalShortcut.register(selectShortcut, () => {
      if (this.isQuickSelectVisible) {
        this.closeQuickSelect();
      } else {
        this.showQuickSelect();
      }
    });

    // 注册ESC键关闭窗口
    globalShortcut.register('Escape', () => {
      if (this.isQuickSelectVisible) {
        this.closeQuickSelect();
      }
    });

    // 保持原有的复制和粘贴功能，不拦截任何系统快捷键
    console.log(`已注册快捷键: ${selectShortcut} - 打开/关闭剪贴板历史选择`);
  }

  registerSelectionShortcuts() {
    // 注册数字键1-9用于快速选择（仅在选择窗口显示时有效）
    for (let i = 1; i <= 9; i++) {
      const key = i.toString();
      globalShortcut.register(key, () => {
        if (this.isQuickSelectVisible) {
          this.selectAndPaste(i - 1);
        }
      });
    }
    
    // 注册0键查看更多
    globalShortcut.register('0', () => {
      if (this.isQuickSelectVisible) {
        this.showDetailWindow();
      }
    });
  }

  unregisterSelectionShortcuts() {
    // 取消注册数字键
    for (let i = 1; i <= 9; i++) {
      globalShortcut.unregister(i.toString());
    }
    globalShortcut.unregister('0');
  }

  selectAndPaste(index) {
    if (index >= 0 && index < this.clipboardHistory.length) {
      const item = this.clipboardHistory[index];
      
      // 先执行粘贴，然后关闭窗口 - 这样用户感受到的延迟更少
      this.performPaste(item.content, item.type);
      
      // 立即关闭选择窗口
      this.closeQuickSelect();
    }
  }

  performPaste(content, type) {
    try {
      // 先将内容写入剪贴板
      if (type === 'text') {
        clipboard.writeText(content);
      } else if (type === 'image') {
        const { nativeImage } = require('electron');
        const image = nativeImage.createFromDataURL(content);
        clipboard.writeImage(image);
      }
      
      // 立即执行粘贴操作，减少延迟
      if (process.platform === 'darwin') {
        const { exec } = require('child_process');
        
        // 如果有记录的前台应用，先恢复焦点
        if (this.previousApp) {
          exec(`osascript -e 'tell application "${this.previousApp}" to activate'`, (error) => {
            if (error) {
              console.log('恢复应用焦点失败:', error.message);
            } else {
              console.log('已恢复应用焦点:', this.previousApp);
            }
            
            // 恢复焦点后立即执行粘贴
            setTimeout(() => {
              this.executePaste();
            }, 50); // 减少延迟从100ms到50ms
          });
        } else {
          // 如果没有记录的前台应用，立即执行粘贴
          setTimeout(() => {
            this.executePaste();
          }, 5); // 极小延迟确保剪贴板更新
        }
      }
      
    } catch (error) {
      console.error('粘贴处理出错:', error);
    }
  }

  executePaste() {
    const { exec } = require('child_process');
    
    const tryPaste = (method) => {
      let script = '';
      
      switch (method) {
        case 1:
          script = 'tell application "System Events" to keystroke "v" using command down';
          break;
        case 2:
          script = 'tell application "System Events" to tell (first application process whose frontmost is true) to keystroke "v" using command down';
          break;
        case 3:
          script = `
            tell application "System Events"
              tell (first application process whose frontmost is true)
                try
                  click menu item "粘贴" of menu "编辑" of menu bar 1
                on error
                  click menu item "Paste" of menu "Edit" of menu bar 1
                end try
              end tell
            end tell
          `;
          break;
      }
      
      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.log(`粘贴方法 ${method} 失败:`, error.message);
          if (method < 3) {
            setTimeout(() => tryPaste(method + 1), 10); // 减少重试延迟从30ms到10ms
          } else {
            console.error('所有粘贴方法都失败了，内容已保存到剪贴板');
          }
        } else {
          console.log(`粘贴方法 ${method} 成功！内容已自动粘贴`);
        }
      });
    };
    
    tryPaste(1);
  }

  startClipboardWatcher() {
    // 每100ms检查一次剪贴板变化
    setInterval(() => {
      this.checkClipboardChange();
    }, 100);
  }

  checkClipboardChange() {
    try {
      const currentText = clipboard.readText();
      const currentImage = clipboard.readImage();
      
      let newContent = null;
      let contentType = '';
      
      if (currentText && currentText !== this.lastClipboardContent) {
        newContent = currentText;
        contentType = 'text';
        this.lastClipboardContent = currentText;
      } else if (!currentImage.isEmpty() && currentImage.toDataURL() !== this.lastClipboardContent) {
        newContent = currentImage.toDataURL();
        contentType = 'image';
        this.lastClipboardContent = currentImage.toDataURL();
      }
      
      if (newContent) {
        this.addToHistory(newContent, contentType);
      }
    } catch (error) {
      console.error('剪贴板检查错误:', error);
    }
  }

  addToHistory(content, type) {
    const timestamp = new Date().toISOString();
    
    // 先检查是否已存在相同内容，如果存在就移除旧的
    this.clipboardHistory = this.clipboardHistory.filter(item => {
      if (type === 'text' && item.type === 'text') {
        // 对文本进行去空格比较，避免空格差异导致的重复
        return item.content.trim() !== content.trim();
      } else if (type === 'image' && item.type === 'image') {
        // 对于图片，比较 dataURL
        return item.content !== content;
      }
      return true; // 不同类型的内容保留
    });

    const newItem = {
      id: Date.now(),
      content,
      type,
      timestamp,
      preview: type === 'text' ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : '图片'
    };

    // 添加到历史记录开头
    this.clipboardHistory.unshift(newItem);
    
    // 保持最多50条记录
    if (this.clipboardHistory.length > 50) {
      this.clipboardHistory = this.clipboardHistory.slice(0, 50);
    }
    
    console.log(`📋 已添加到剪贴板历史: ${type === 'text' ? content.substring(0, 30) + '...' : '图片'} (历史记录总数: ${this.clipboardHistory.length})`);
    
    // 保存到存储
    this.store.set('clipboardHistory', this.clipboardHistory);
  }

  showQuickSelect() {
    if (this.isQuickSelectVisible) return;
    
    // 首先记录当前活动的应用
    this.recordCurrentApp();
    
    this.isQuickSelectVisible = true;
    const windowWidth = 400;
    // 计算窗口高度：头部(40px) + 内容区域(最多300px) + 底部(30px) + 边距
    const maxContentHeight = 300;
    const headerHeight = 40;
    const footerHeight = 30;
    const padding = 20;
    const windowHeight = Math.min(450, headerHeight + Math.min(maxContentHeight, Math.max(100, this.clipboardHistory.slice(0, 10).length * 50)) + footerHeight + padding);
    
    // 获取鼠标光标位置
    const cursorPoint = screen.getCursorScreenPoint();
    
    // 获取光标所在的显示器
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { workArea } = currentDisplay;
    
    console.log(`光标位置: (${cursorPoint.x}, ${cursorPoint.y})`);
    console.log(`当前显示器工作区域: x=${workArea.x}, y=${workArea.y}, width=${workArea.width}, height=${workArea.height}`);
    
    // 在光标所在的显示器上居中显示窗口
    const windowX = workArea.x + Math.round((workArea.width - windowWidth) / 2);
    const windowY = workArea.y + Math.round((workArea.height - windowHeight) / 2);
    
    console.log(`窗口在显示器中央位置: (${windowX}, ${windowY})`);
    
    this.quickSelectWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: windowX,
      y: windowY,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      minimizable: false,
      maximizable: false,
      closable: true, // 允许关闭
      focusable: false,
      show: false,
      type: 'panel', // 使用panel类型，这在macOS上不会抢夺焦点
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.quickSelectWindow.loadFile('src/quickSelect.html');
    
    this.quickSelectWindow.on('closed', () => {
      this.isQuickSelectVisible = false;
      this.quickSelectWindow = null;
      // 确保取消注册数字键快捷键
      this.unregisterSelectionShortcuts();
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
        this.autoCloseTimer = null;
      }
    });
    
    // 设置定时关闭，避免窗口一直显示
    this.autoCloseTimer = setTimeout(() => {
      if (this.isQuickSelectVisible) {
        this.closeQuickSelect();
      }
    }, 10000); // 10秒后自动关闭

    // 发送历史记录到渲染进程
    this.quickSelectWindow.webContents.once('dom-ready', () => {
      this.quickSelectWindow.webContents.send('clipboard-history', this.clipboardHistory.slice(0, 10));
      
      // 显示窗口但不获取焦点
      this.quickSelectWindow.showInactive();
      
      // 注册数字键快捷键
      this.registerSelectionShortcuts();
      
      // 确保原应用保持焦点
      setTimeout(() => {
        this.restorePreviousApp();
      }, 10);
    });
  }

  recordCurrentApp() {
    // 使用 AppleScript 记录当前活动的应用
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"', (error, stdout, stderr) => {
        if (!error) {
          this.previousApp = stdout.trim();
          console.log('记录前台应用:', this.previousApp);
        }
      });
    }
  }

  restorePreviousApp() {
    // 恢复之前的应用焦点
    if (process.platform === 'darwin' && this.previousApp) {
      const { exec } = require('child_process');
      exec(`osascript -e 'tell application "${this.previousApp}" to activate'`, (error) => {
        if (error) {
          console.log('恢复应用焦点失败:', error.message);
        } else {
          console.log('已恢复应用焦点:', this.previousApp);
        }
      });
    }
  }

  closeQuickSelect() {
    if (this.quickSelectWindow) {
      this.quickSelectWindow.close();
    }
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    // 取消注册数字键快捷键
    this.unregisterSelectionShortcuts();
    // 更新状态
    this.isQuickSelectVisible = false;
  }



  showDetailWindow() {
    // 先关闭快速选择窗口
    this.closeQuickSelect();
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 600;
    const windowHeight = 500;
    
    this.detailWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round((width - windowWidth) / 2),
      y: Math.round((height - windowHeight) / 2),
      frame: true,
      resizable: true,
      alwaysOnTop: true,
      title: '剪贴板历史记录',
      transparent: false,
      opacity: 1.0,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        webSecurity: true
      }
    });

    this.detailWindow.loadFile('src/detailWindow.html');
    
    this.detailWindow.on('closed', () => {
      this.detailWindow = null;
    });
    
    this.detailWindow.webContents.once('dom-ready', () => {
      this.detailWindow.webContents.send('clipboard-history', this.clipboardHistory);
    });
  }

  clearHistory() {
    this.clipboardHistory = [];
    this.store.set('clipboardHistory', []);
  }

  setupAutoUpdater() {
    // 配置自动更新
    autoUpdater.checkForUpdatesAndNotify();
    
    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 正在检查更新...');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('🎉 发现新版本:', info.version);
      console.log('📝 更新说明:', info.releaseNotes);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ 当前已是最新版本:', info.version);
    });
    
    autoUpdater.on('error', (err) => {
      console.log('❌ 自动更新出错:', err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "下载速度: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - 已下载 ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log('📥', log_message);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ 更新下载完成:', info.version);
      console.log('🔄 应用将在下次启动时更新');
      
      // 可以选择立即重启更新，或者提示用户
      // autoUpdater.quitAndInstall(); // 立即重启更新
      
      // 或者添加到托盘菜单让用户选择
      this.updateTrayMenuWithUpdate();
    });
    
    // 每小时检查一次更新
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
  }

  updateTrayMenuWithUpdate() {
    // 更新托盘菜单，添加"安装更新"选项
    if (this.tray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '🎉 安装更新并重启',
          click: () => {
            const { autoUpdater } = require('electron-updater');
            autoUpdater.quitAndInstall();
          }
        },
        { type: 'separator' },
        {
          label: '显示剪贴板历史',
          click: () => this.showQuickSelect()
        },
        { type: 'separator' },
        {
          label: '清理重复记录',
          click: () => {
            this.deduplicateHistory();
            console.log('✨ 手动去重完成');
          }
        },
        {
          label: '清空历史记录',
          click: () => this.clearHistory()
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            this.cleanup();
            app.quit();
          }
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
    }
  }

  cleanup() {
    // 注销全局快捷键
    globalShortcut.unregisterAll();
    console.log('已恢复系统快捷键');
  }
}

// IPC 通信处理（保留用于详细窗口的点击功能）
ipcMain.handle('paste-item', async (event, content, type) => {
  // 立即关闭详细窗口，减少用户感知延迟
  if (clipboardManager.detailWindow) {
    clipboardManager.detailWindow.close();
  }
  
  // 然后执行粘贴操作
  clipboardManager.performPaste(content, type);
  
  return true;
});

ipcMain.handle('show-detail', () => {
  clipboardManager.showDetailWindow();
});

ipcMain.handle('close-quick-select', () => {
  clipboardManager.closeQuickSelect();
});

// 应用初始化
let clipboardManager;

app.whenReady().then(() => {
  // 隐藏Dock图标（仅保留系统托盘）
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  clipboardManager = new ClipboardManager();
  clipboardManager.init();
});

app.on('window-all-closed', (event) => {
  // 阻止应用完全退出，保持在后台运行
  event.preventDefault();
});

app.on('activate', () => {
  // macOS 特有行为
}); 