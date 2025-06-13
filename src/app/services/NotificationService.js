const { Notification } = require('electron');
const Logger = require('../utils/Logger');
const { AppConfig } = require('../config/AppConfig');

class NotificationService {
  constructor(clipboardManager) {
    this.clipboardManager = clipboardManager;
    this.isSupported = Notification.isSupported();
    this.enabled = AppConfig.get('notifications.enabled');
  }

  async init() {
    if (this.isSupported) {
      Logger.success('系统支持通知功能');
      Logger.info('Electron 应用的通知权限由系统自动管理');
    } else {
      Logger.warn('系统不支持通知功能');
      this.enabled = false;
    }
  }

  showDuplicateStartupNotification() {
    if (!this.enabled || !this.isSupported) {
      Logger.debug('通知功能被禁用或不支持');
      return;
    }

    try {
      Logger.info('正在显示重复启动通知...');
      
      const config = AppConfig.get('notifications.duplicateStartup');
      const notification = new Notification({
        title: config.title,
        body: config.body,
        silent: AppConfig.get('notifications.silent')
      });
      
      this.setupNotificationEvents(notification, () => {
        Logger.debug('用户点击了重复启动通知');
        if (this.clipboardManager) {
          this.clipboardManager.showQuickSelect();
        }
      });
      
      notification.show();
      
    } catch (error) {
      Logger.error('显示重复启动通知时出错:', error.message);
    }
  }

  showTestNotification() {
    if (!this.enabled || !this.isSupported) {
      Logger.debug('通知功能被禁用或不支持');
      return;
    }

    try {
      Logger.info('测试通知功能...');
      
      const notification = new Notification({
        title: '剪贴板管理器',
        body: '通知功能测试成功！应用运行正常。',
        silent: AppConfig.get('notifications.silent')
      });
      
      this.setupNotificationEvents(notification);
      notification.show();
      
    } catch (error) {
      Logger.error('显示测试通知时出错:', error.message);
    }
  }

  showUpdateNotification(version, releaseNotes) {
    if (!this.enabled || !this.isSupported) {
      Logger.debug('通知功能被禁用或不支持');
      return;
    }

    try {
      const notification = new Notification({
        title: '剪贴板管理器 - 更新可用',
        body: `发现新版本 ${version}，应用将在下次启动时更新`,
        silent: AppConfig.get('notifications.silent')
      });
      
      this.setupNotificationEvents(notification, () => {
        Logger.debug('用户点击了更新通知');
        // 可以在这里打开更新日志或相关页面
      });
      
      notification.show();
      
    } catch (error) {
      Logger.error('显示更新通知时出错:', error.message);
    }
  }

  showErrorNotification(errorMessage) {
    if (!this.enabled || !this.isSupported) {
      Logger.debug('通知功能被禁用或不支持');
      return;
    }

    try {
      const notification = new Notification({
        title: '剪贴板管理器 - 错误',
        body: `应用出现错误：${errorMessage}`,
        silent: false // 错误通知不应该静默
      });
      
      this.setupNotificationEvents(notification);
      notification.show();
      
    } catch (error) {
      Logger.error('显示错误通知时出错:', error.message);
    }
  }

  showCustomNotification(title, body, onClick = null) {
    if (!this.enabled || !this.isSupported) {
      Logger.debug('通知功能被禁用或不支持');
      return;
    }

    try {
      const notification = new Notification({
        title,
        body,
        silent: AppConfig.get('notifications.silent')
      });
      
      this.setupNotificationEvents(notification, onClick);
      notification.show();
      
    } catch (error) {
      Logger.error('显示自定义通知时出错:', error.message);
    }
  }

  setupNotificationEvents(notification, onClick = null) {
    notification.on('show', () => {
      Logger.debug('通知已显示');
    });

    notification.on('close', () => {
      Logger.debug('通知已关闭');
    });

    notification.on('click', () => {
      Logger.debug('通知被点击');
      if (onClick && typeof onClick === 'function') {
        onClick();
      }
    });

    notification.on('failed', (event, error) => {
      Logger.error('通知显示失败:', error);
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled && this.isSupported;
    Logger.info(`通知功能已${this.enabled ? '启用' : '禁用'}`);
  }

  isEnabled() {
    return this.enabled && this.isSupported;
  }

  getStatus() {
    return {
      supported: this.isSupported,
      enabled: this.enabled,
      available: this.enabled && this.isSupported
    };
  }
}

module.exports = NotificationService; 