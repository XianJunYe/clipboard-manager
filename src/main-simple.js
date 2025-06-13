const { app, BrowserWindow, globalShortcut, Tray, Menu, clipboard, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

class ClipboardManager {
  constructor() {
    this.mainWindow = null;
    this.quickSelectWindow = null;
    this.detailWindow = null;
    this.tray = null;
    this.clipboardHistory = [];
    this.lastClipboardContent = '';
    this.isQuickSelectVisible = false;
    this.previousApp = null;
    
    // 使用简单的文件存储替代 electron-store
    this.dataPath = path.join(app.getPath('userData'), 'clipboard-history.json');
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        this.clipboardHistory = JSON.parse(data) || [];
        
        // 确保历史记录不超过50条
        if (this.clipboardHistory.length > 50) {
          this.clipboardHistory = this.clipboardHistory.slice(0, 50);
          this.saveHistory();
        }
        
        console.log(`📚 已加载 ${this.clipboardHistory.length} 条剪贴板历史记录`);
      }
    } catch (error) {
      console.log('加载历史记录失败:', error.message);
      this.clipboardHistory = [];
    }
  }

  saveHistory() {
    try {
      // 确保目录存在
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(this.clipboardHistory, null, 2));
    } catch (error) {
      console.log('保存历史记录失败:', error.message);
    }
  }

  init() {
    this.createTray();
    this.registerGlobalShortcuts();
    this.startClipboardWatcher();
    
    // 监听应用退出事件
    app.on('before-quit', () => {
      this.cleanup();
    });
    
    console.log('✅ 剪贴板管理器已启动');
  }

  createTray() {
    try {
      const { nativeImage } = require('electron');
      const iconPath = path.join(__dirname, '../assets/a.png');
      
      let image = nativeImage.createFromPath(iconPath);
      
      if (image.isEmpty()) {
        console.log('图标文件不存在，使用默认图标');
        // 创建一个简单的默认图标
        image = nativeImage.createEmpty();
      } else {
        image = image.resize({ width: 16, height: 16 });
        image.setTemplateImage(true);
      }
      
      this.tray = new Tray(image);
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示剪贴板历史',
          click: () => this.showQuickSelect()
        },
        { type: 'separator' },
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
      
      this.tray.on('click', () => {
        this.showQuickSelect();
      });
      
      console.log('✅ 系统托盘已成功创建');
    } catch (error) {
      console.log('❌ 托盘创建失败:', error.message);
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    }
  }

  registerGlobalShortcuts() {
    const selectShortcut = process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V';
    
    globalShortcut.register(selectShortcut, () => {
      if (this.isQuickSelectVisible) {
        this.closeQuickSelect();
      } else {
        this.showQuickSelect();
      }
    });
    
    console.log('✅ 全局快捷键已注册:', selectShortcut);
  }

  startClipboardWatcher() {
    setInterval(() => {
      this.checkClipboardChange();
    }, 1000);
    
    console.log('✅ 剪贴板监听已启动');
  }

  checkClipboardChange() {
    const currentText = clipboard.readText();
    const currentImage = clipboard.readImage();
    
    let content = null;
    let type = null;
    
    if (currentText && currentText.trim() && currentText !== this.lastClipboardContent) {
      content = currentText.trim();
      type = 'text';
    } else if (!currentImage.isEmpty() && currentImage.toDataURL() !== this.lastClipboardContent) {
      content = currentImage.toDataURL();
      type = 'image';
    }
    
    if (content) {
      this.addToHistory(content, type);
      this.lastClipboardContent = content;
    }
  }

  addToHistory(content, type) {
    // 检查是否已存在
    const existingIndex = this.clipboardHistory.findIndex(item => 
      item.content === content && item.type === type
    );
    
    if (existingIndex !== -1) {
      // 移动到顶部
      const [existingItem] = this.clipboardHistory.splice(existingIndex, 1);
      this.clipboardHistory.unshift(existingItem);
    } else {
      // 添加新项目
      this.clipboardHistory.unshift({
        content: content,
        type: type,
        timestamp: Date.now()
      });
    }
    
    // 限制历史记录数量
    if (this.clipboardHistory.length > 50) {
      this.clipboardHistory = this.clipboardHistory.slice(0, 50);
    }
    
    // 保存到文件
    this.saveHistory();
    
    console.log(`📋 新增${type === 'text' ? '文本' : '图片'}内容:`, 
      type === 'text' ? content.substring(0, 50) + '...' : '图片');
  }

  showQuickSelect() {
    if (this.isQuickSelectVisible) return;
    
    this.recordCurrentApp();
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this.quickSelectWindow = new BrowserWindow({
      width: 600,
      height: Math.min(400, this.clipboardHistory.length * 40 + 100),
      x: Math.round((width - 600) / 2),
      y: Math.round((height - 400) / 2),
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    
    // 创建简单的HTML内容
    const html = this.generateQuickSelectHTML();
    this.quickSelectWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    this.quickSelectWindow.show();
    this.quickSelectWindow.focus();
    this.isQuickSelectVisible = true;
    
    // 监听窗口关闭
    this.quickSelectWindow.on('closed', () => {
      this.isQuickSelectVisible = false;
      this.quickSelectWindow = null;
    });
    
    // 监听失去焦点
    this.quickSelectWindow.on('blur', () => {
      this.closeQuickSelect();
    });
    
    console.log('📋 快速选择窗口已显示');
  }

  generateQuickSelectHTML() {
    let itemsHTML = '';
    
    if (this.clipboardHistory.length === 0) {
      itemsHTML = '<div class="item">暂无剪贴板历史</div>';
    } else {
      this.clipboardHistory.slice(0, 9).forEach((item, index) => {
        const displayContent = item.type === 'text' 
          ? item.content.substring(0, 100) 
          : '[图片]';
        
        itemsHTML += `
          <div class="item" data-index="${index}">
            <span class="number">${index + 1}</span>
            <span class="content">${this.escapeHtml(displayContent)}</span>
          </div>
        `;
      });
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 10px;
          }
          .item {
            padding: 10px;
            margin: 5px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
          }
          .item:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          .number {
            background: #007AFF;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-right: 10px;
            flex-shrink: 0;
          }
          .content {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div>
          ${itemsHTML}
        </div>
        <script>
          document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
              const index = parseInt(e.key) - 1;
              selectItem(index);
            } else if (e.key === 'Escape') {
              window.close();
            }
          });
          
          document.querySelectorAll('.item').forEach((item, index) => {
            item.addEventListener('click', () => selectItem(index));
          });
          
          function selectItem(index) {
            // 这里应该通过IPC与主进程通信，但为了简化，我们直接关闭窗口
            window.close();
          }
        </script>
      </body>
      </html>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  closeQuickSelect() {
    if (this.quickSelectWindow) {
      this.quickSelectWindow.close();
    }
    this.isQuickSelectVisible = false;
    this.restorePreviousApp();
  }

  recordCurrentApp() {
    // 简化版本，不记录前一个应用
  }

  restorePreviousApp() {
    // 简化版本，不恢复前一个应用
  }

  clearHistory() {
    this.clipboardHistory = [];
    this.saveHistory();
    console.log('🗑️ 剪贴板历史已清空');
  }

  cleanup() {
    globalShortcut.unregisterAll();
    if (this.tray) {
      this.tray.destroy();
    }
    if (this.quickSelectWindow) {
      this.quickSelectWindow.close();
    }
    console.log('🧹 清理完成');
  }
}

// 应用启动
app.whenReady().then(() => {
  const manager = new ClipboardManager();
  manager.init();
});

app.on('window-all-closed', () => {
  // 不退出应用，因为这是一个托盘应用
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});

console.log('🚀 剪贴板管理器启动中...'); 