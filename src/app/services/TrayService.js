const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');
const { AppConfig } = require('../config/AppConfig');

class TrayService {
  constructor(clipboardManager) {
    this.clipboardManager = clipboardManager;
    this.tray = null;
  }

  create() {
    // 使用相对于src目录的路径（与原始代码保持一致）
    const iconPath = path.join(__dirname, '../../../assets/a.png');
    
    Logger.debug('托盘图标路径:', iconPath);
    Logger.debug('图标文件是否存在:', fs.existsSync(iconPath));
    
    try {
      const image = this.createTrayImage(iconPath);
      this.tray = new Tray(image);
      this.setupTrayMenu();
      this.setupTrayEvents();
      
      Logger.success('系统托盘已成功创建并激活');
      Logger.info('请检查macOS菜单栏右上角（WiFi、电池图标附近）');
      Logger.debug('如果看不到图标，请尝试调整菜单栏显示设置');
      
      return true;
    } catch (error) {
      Logger.error('系统托盘创建失败:', error.message);
      Logger.error('错误详情:', error);
      return false;
    }
  }

  createTrayImage(iconPath) {
    try {
      let image = nativeImage.createFromPath(iconPath);
      
      if (image.isEmpty()) {
        Logger.debug('图标为空，尝试使用buffer方式加载');
        if (fs.existsSync(iconPath)) {
          const buffer = fs.readFileSync(iconPath);
          image = nativeImage.createFromBuffer(buffer);
        } else {
          throw new Error('图标文件不存在');
        }
      }
      
      if (!image.isEmpty()) {
        const iconSize = AppConfig.get('tray.iconSize');
        image = image.resize(iconSize);
        image.setTemplateImage(true);
        Logger.success('成功加载自定义图标:', iconPath);
        Logger.debug('托盘图标尺寸:', image.getSize());
      }
      
      return image;
    } catch (error) {
      Logger.warn('加载自定义图标失败:', error.message);
      
      // 不使用dock作为备用方案，保持应用在后台运行
      Logger.info('托盘图标加载失败，应用将在后台运行');
      Logger.info('可通过快捷键 Command+Shift+V 访问功能');
      
      throw error;
    }
  }

  setupTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示剪贴板历史',
        click: () => this.clipboardManager.showQuickSelect()
      },
      { type: 'separator' },
      {
        label: '🔔 测试通知',
        click: () => this.clipboardManager.testNotification()
      },
      {
        label: '🔍 检查更新',
        click: () => this.clipboardManager.manualCheckForUpdates()
      },
      { type: 'separator' },
      {
        label: '清理重复记录',
        click: () => {
          this.clipboardManager.deduplicateHistory();
          Logger.success('手动去重完成');
        }
      },
      {
        label: '清空历史记录',
        click: () => this.clipboardManager.clearHistory()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.clipboardManager.cleanup();
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip(AppConfig.get('tray.tooltip'));
  }

  setupTrayEvents() {
    // 右键点击事件
    this.tray.on('right-click', () => {
      Logger.debug('托盘图标被右键点击');
    });
    
    // 左键点击事件已被移除，避免误触发窗口弹出
    // 用户可通过右键菜单或快捷键访问功能
  }

  updateMenu(menuTemplate) {
    if (this.tray && !this.tray.isDestroyed()) {
      const contextMenu = Menu.buildFromTemplate(menuTemplate);
      this.tray.setContextMenu(contextMenu);
    }
  }

  destroy() {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
      Logger.info('托盘图标已销毁');
    }
  }

  isCreated() {
    return this.tray && !this.tray.isDestroyed();
  }
}

module.exports = TrayService; 