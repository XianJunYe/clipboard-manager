const { app, BrowserWindow, screen, ipcMain } = require('electron');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const Logger = require('../utils/Logger');
const { AppConfig } = require('../config/AppConfig');
const TrayService = require('../services/TrayService');
const ShortcutService = require('../services/ShortcutService');
const ClipboardWatcher = require('../services/ClipboardWatcher');
const NotificationService = require('../services/NotificationService');

class ClipboardManager {
  constructor() {
    this.store = new Store();
    this.clipboardHistory = [];
    this.isQuickSelectVisible = false;
    this.previousApp = null;
    
    // 窗口实例
    this.mainWindow = null;
    this.quickSelectWindow = null;
    this.detailWindow = null;
    
    // 服务实例
    this.trayService = new TrayService(this);
    this.shortcutService = new ShortcutService(this);
    this.clipboardWatcher = new ClipboardWatcher(this);
    this.notificationService = new NotificationService(this);
    
    this.initializeData();
    this.setupIpcHandlers();
  }

  initializeData() {
    // 加载历史记录
    this.clipboardHistory = this.store.get('clipboardHistory', []);
    
    // 确保历史记录不超过最大限制
    const maxHistory = AppConfig.get('clipboard.maxHistory');
    if (this.clipboardHistory.length > maxHistory) {
      this.clipboardHistory = this.clipboardHistory.slice(0, maxHistory);
      this.store.set('clipboardHistory', this.clipboardHistory);
    }
  }

  async init() {
    try {
      Logger.info('初始化剪贴板管理器...');
      
      // 初始化各个服务
      await this.notificationService.init();
      
      if (AppConfig.get('clipboard.deduplicateOnStart')) {
        this.deduplicateHistory();
      }
      
      this.trayService.create();
      this.shortcutService.registerGlobalShortcuts();
      this.clipboardWatcher.start();
      this.setupAutoUpdater();
      
      // 监听应用退出事件
      app.on('before-quit', () => {
        this.cleanup();
      });
      
      Logger.success('剪贴板管理器初始化完成');
      
    } catch (error) {
      Logger.error('初始化剪贴板管理器失败:', error.message);
      this.notificationService.showErrorNotification('初始化失败: ' + error.message);
    }
  }

  setupIpcHandlers() {
    ipcMain.handle('paste-item', async (event, content, type) => {
      this.performPaste(content, type);
    });

    ipcMain.handle('close-quick-select', async (event) => {
      this.closeQuickSelect();
    });

    ipcMain.handle('show-detail', async (event) => {
      this.showDetailWindow();
    });
  }

  deduplicateHistory() {
    const originalLength = this.clipboardHistory.length;
    const seen = new Set();
    
    this.clipboardHistory = this.clipboardHistory.filter(item => {
      let key;
      if (item.type === 'text') {
        key = `${item.type}:${item.content.trim()}`;
      } else {
        key = `${item.type}:${item.content}`;
      }
      
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    const removedCount = originalLength - this.clipboardHistory.length;
    if (removedCount > 0) {
      Logger.info(`已清理 ${removedCount} 条重复的剪贴板记录`);
      this.store.set('clipboardHistory', this.clipboardHistory);
    }
    
    if (this.clipboardHistory.length > 0) {
      Logger.info(`已加载 ${this.clipboardHistory.length} 条剪贴板历史记录`);
    }
  }

  addToHistory(content, type) {
    if (!content) return;

    // 创建新记录
    const newItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      content,
      type,
      timestamp: Date.now(),
      preview: this.generatePreview(content, type)
    };

    // 检查是否与最近的记录重复
    if (this.clipboardHistory.length > 0) {
      const lastItem = this.clipboardHistory[0];
      if (lastItem.content === content && lastItem.type === type) {
        return; // 忽略重复内容
      }
    }

    // 添加到历史记录开头
    this.clipboardHistory.unshift(newItem);

    // 限制历史记录数量
    const maxHistory = AppConfig.get('clipboard.maxHistory');
    if (this.clipboardHistory.length > maxHistory) {
      this.clipboardHistory = this.clipboardHistory.slice(0, maxHistory);
    }

    // 保存到存储
    this.store.set('clipboardHistory', this.clipboardHistory);

    const previewText = type === 'text' ? 
      content.substring(0, 30) + (content.length > 30 ? '...' : '') : 
      '图片';
    
    Logger.info(`已添加到剪贴板历史: ${previewText} (历史记录总数: ${this.clipboardHistory.length})`);
  }

  generatePreview(content, type) {
    if (type === 'text') {
      const maxPreview = AppConfig.get('clipboard.maxTextPreview');
      return content.length > maxPreview ? 
        content.substring(0, maxPreview) + '...' : 
        content;
    }
    return '图片';
  }

  showQuickSelect() {
    if (this.isQuickSelectVisible) return;

    try {
      this.recordCurrentApp();
      this.isQuickSelectVisible = true;

      // 获取光标位置和显示器信息
      const cursorPoint = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursorPoint);
      const workArea = display.workAreaSize;

      Logger.debug(`光标位置: (${cursorPoint.x}, ${cursorPoint.y})`);
      Logger.debug(`当前显示器工作区域: x=${workArea.x}, y=${workArea.y}, width=${workArea.width}, height=${workArea.height}`);

      const windowWidth = 500;
      const windowHeight = 400;
      const windowX = Math.round(cursorPoint.x - windowWidth / 2);
      const windowY = Math.round(cursorPoint.y - windowHeight / 2);

      Logger.debug(`窗口在显示器中央位置: (${windowX}, ${windowY})`);

      this.quickSelectWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        }
      });

      this.quickSelectWindow.loadFile('src/quickSelect.html');

      this.quickSelectWindow.on('closed', () => {
        this.isQuickSelectVisible = false;
        this.quickSelectWindow = null;
        this.shortcutService.unregisterSelectionShortcuts();
      });

      this.shortcutService.registerSelectionShortcuts();

      this.quickSelectWindow.webContents.once('dom-ready', () => {
        const maxItems = AppConfig.get('ui.quickSelectMaxItems');
        this.quickSelectWindow.webContents.send('clipboard-history', 
          this.clipboardHistory.slice(0, maxItems + 1));
      });

      this.quickSelectWindow.showInactive();

    } catch (error) {
      Logger.error('显示快速选择窗口失败:', error.message);
      this.isQuickSelectVisible = false;
    }
  }

  closeQuickSelect() {
    if (this.quickSelectWindow) {
      this.quickSelectWindow.close();
    }
    this.restorePreviousApp();
    this.isQuickSelectVisible = false;
    this.shortcutService.unregisterSelectionShortcuts();
  }

  recordCurrentApp() {
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"', 
        (error, stdout) => {
          if (!error && stdout.trim()) {
            this.previousApp = stdout.trim();
            Logger.debug('记录前台应用:', this.previousApp);
          }
        });
    }
  }

  restorePreviousApp() {
    if (this.previousApp && process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`osascript -e 'tell application "${this.previousApp}" to activate'`, (error) => {
        if (error) {
          Logger.debug('恢复应用焦点失败:', error.message);
        } else {
          Logger.debug('已恢复应用焦点:', this.previousApp);
        }
      });
    }
  }

  selectAndPaste(index) {
    if (index >= 0 && index < this.clipboardHistory.length) {
      const item = this.clipboardHistory[index];
      this.performPaste(item.content, item.type);
      this.closeQuickSelect();
    }
  }

  performPaste(content, type) {
    try {
      // 设置剪贴板内容
      this.clipboardWatcher.setContent(content, type);
      
      // 执行粘贴操作
      if (process.platform === 'darwin') {
        const restoreDelay = AppConfig.get('ui.restoreAppDelay');
        const pasteDelay = AppConfig.get('ui.pasteDelay');
        
        if (this.previousApp) {
          this.restorePreviousApp();
          setTimeout(() => {
            this.executePaste();
          }, restoreDelay);
        } else {
          setTimeout(() => {
            this.executePaste();
          }, pasteDelay);
        }
      }
      
    } catch (error) {
      Logger.error('粘贴处理出错:', error.message);
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
      
      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          Logger.debug(`粘贴方法 ${method} 失败:`, error.message);
          if (method < 3) {
            setTimeout(() => tryPaste(method + 1), 10);
          } else {
            Logger.error('所有粘贴方法都失败了，内容已保存到剪贴板');
          }
        } else {
          Logger.success(`粘贴方法 ${method} 成功！内容已自动粘贴`);
        }
      });
    };
    
    tryPaste(1);
  }

  showDetailWindow() {
    // 详细窗口的实现（保持原有逻辑）
    Logger.info('显示详细窗口');
    // TODO: 实现详细窗口
  }

  clearHistory() {
    this.clipboardHistory = [];
    this.store.set('clipboardHistory', []);
    Logger.info('剪贴板历史记录已清空');
  }

  testNotification() {
    this.notificationService.showTestNotification();
  }

  setupAutoUpdater() {
    // 自动更新逻辑（保持原有逻辑）
    if (AppConfig.get('updater.autoCheck')) {
      Logger.info('自动更新已配置，可通过托盘菜单手动检查更新');
    }
  }

  manualCheckForUpdates() {
    Logger.info('手动检查更新...');
    // TODO: 实现手动更新检查
  }

  cleanup() {
    Logger.info('清理资源...');
    
    this.clipboardWatcher.stop();
    this.shortcutService.unregisterAll();
    this.trayService.destroy();
    
    if (this.quickSelectWindow) {
      this.quickSelectWindow.close();
    }
    
    if (this.detailWindow) {
      this.detailWindow.close();
    }
    
    Logger.info('资源清理完成');
  }

  // 获取应用状态信息
  getStatus() {
    return {
      historyCount: this.clipboardHistory.length,
      isQuickSelectVisible: this.isQuickSelectVisible,
      tray: this.trayService.isCreated(),
      shortcuts: this.shortcutService.getRegisteredShortcuts(),
      watcher: this.clipboardWatcher.getStats(),
      notifications: this.notificationService.getStatus()
    };
  }
}

module.exports = ClipboardManager; 