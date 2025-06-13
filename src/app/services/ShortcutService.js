const { globalShortcut } = require('electron');
const Logger = require('../utils/Logger');
const { AppConfig } = require('../config/AppConfig');

class ShortcutService {
  constructor(clipboardManager) {
    this.clipboardManager = clipboardManager;
    this.registeredShortcuts = new Set();
  }

  registerGlobalShortcuts() {
    const selectShortcut = AppConfig.get('shortcuts.toggleQuickSelect');
    const closeShortcut = AppConfig.get('shortcuts.closeWindow');
    
    // 注册主快捷键：打开/关闭剪贴板选择窗口
    this.register(selectShortcut, () => {
      if (this.clipboardManager.isQuickSelectVisible) {
        this.clipboardManager.closeQuickSelect();
      } else {
        this.clipboardManager.showQuickSelect();
      }
    });

    // 注册ESC键关闭窗口
    this.register(closeShortcut, () => {
      if (this.clipboardManager.isQuickSelectVisible) {
        this.clipboardManager.closeQuickSelect();
      }
    });

    Logger.success(`已注册快捷键: ${selectShortcut} - 打开/关闭剪贴板历史选择`);
  }

  registerSelectionShortcuts() {
    // 注册数字键1-9用于快速选择（仅在选择窗口显示时有效）
    const maxItems = AppConfig.get('ui.quickSelectMaxItems');
    
    for (let i = 1; i <= maxItems; i++) {
      const key = i.toString();
      this.register(key, () => {
        if (this.clipboardManager.isQuickSelectVisible) {
          this.clipboardManager.selectAndPaste(i - 1);
        }
      });
    }
    
    // 注册0键查看更多
    this.register('0', () => {
      if (this.clipboardManager.isQuickSelectVisible) {
        this.clipboardManager.showDetailWindow();
      }
    });
    
    Logger.debug('已注册数字键快捷键');
  }

  unregisterSelectionShortcuts() {
    const maxItems = AppConfig.get('ui.quickSelectMaxItems');
    
    // 取消注册数字键
    for (let i = 1; i <= maxItems; i++) {
      this.unregister(i.toString());
    }
    this.unregister('0');
    
    Logger.debug('已取消注册数字键快捷键');
  }

  register(shortcut, callback) {
    try {
      if (globalShortcut.isRegistered(shortcut)) {
        Logger.warn(`快捷键 ${shortcut} 已被注册`);
        return false;
      }
      
      const success = globalShortcut.register(shortcut, callback);
      if (success) {
        this.registeredShortcuts.add(shortcut);
        Logger.debug(`快捷键 ${shortcut} 注册成功`);
        return true;
      } else {
        Logger.error(`快捷键 ${shortcut} 注册失败`);
        return false;
      }
    } catch (error) {
      Logger.error(`注册快捷键 ${shortcut} 时出错:`, error.message);
      return false;
    }
  }

  unregister(shortcut) {
    try {
      if (globalShortcut.isRegistered(shortcut)) {
        globalShortcut.unregister(shortcut);
        this.registeredShortcuts.delete(shortcut);
        Logger.debug(`快捷键 ${shortcut} 已取消注册`);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error(`取消注册快捷键 ${shortcut} 时出错:`, error.message);
      return false;
    }
  }

  unregisterAll() {
    try {
      for (const shortcut of this.registeredShortcuts) {
        if (globalShortcut.isRegistered(shortcut)) {
          globalShortcut.unregister(shortcut);
        }
      }
      this.registeredShortcuts.clear();
      Logger.info('已取消注册所有快捷键');
    } catch (error) {
      Logger.error('取消注册快捷键时出错:', error.message);
    }
  }

  isRegistered(shortcut) {
    return globalShortcut.isRegistered(shortcut);
  }

  getRegisteredShortcuts() {
    return Array.from(this.registeredShortcuts);
  }
}

module.exports = ShortcutService; 