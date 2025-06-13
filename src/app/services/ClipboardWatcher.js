const { clipboard } = require('electron');
const Logger = require('../utils/Logger');
const { AppConfig } = require('../config/AppConfig');

class ClipboardWatcher {
  constructor(clipboardManager) {
    this.clipboardManager = clipboardManager;
    this.lastClipboardContent = '';
    this.isWatching = false;
    this.watchInterval = null;
    this.consecutiveNoChange = 0;
  }

  start() {
    if (this.isWatching) {
      Logger.warn('剪贴板监控已在运行中');
      return;
    }

    this.isWatching = true;
    Logger.info('开始监控剪贴板变化');
    this.scheduleCheck();
  }

  stop() {
    if (this.watchInterval) {
      clearTimeout(this.watchInterval);
      this.watchInterval = null;
    }
    this.isWatching = false;
    Logger.info('停止监控剪贴板变化');
  }

  scheduleCheck() {
    if (!this.isWatching) return;

    const baseInterval = AppConfig.get('clipboard.checkInterval');
    const maxInterval = AppConfig.get('performance.maxCheckInterval');
    const maxNoChange = AppConfig.get('performance.maxConsecutiveNoChangeBeforeSlowdown');

    // 动态调整检查间隔
    let interval = baseInterval;
    if (this.consecutiveNoChange > maxNoChange) {
      interval = Math.min(
        baseInterval * (1 + (this.consecutiveNoChange - maxNoChange) * 0.5),
        maxInterval
      );
    }

    this.watchInterval = setTimeout(() => {
      this.checkClipboardChange();
      this.scheduleCheck();
    }, interval);
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
        this.consecutiveNoChange = 0;
      } else if (!currentImage.isEmpty() && currentImage.toDataURL() !== this.lastClipboardContent) {
        newContent = currentImage.toDataURL();
        contentType = 'image';
        this.lastClipboardContent = currentImage.toDataURL();
        this.consecutiveNoChange = 0;
      } else {
        this.consecutiveNoChange++;
        return false;
      }
      
      if (newContent) {
        Logger.debug(`检测到剪贴板变化: ${contentType}`);
        this.clipboardManager.addToHistory(newContent, contentType);
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('剪贴板检查错误:', error.message);
      this.consecutiveNoChange++;
      return false;
    }
  }

  getCurrentContent() {
    try {
      const text = clipboard.readText();
      const image = clipboard.readImage();
      
      if (text) {
        return { content: text, type: 'text' };
      } else if (!image.isEmpty()) {
        return { content: image.toDataURL(), type: 'image' };
      }
      
      return null;
    } catch (error) {
      Logger.error('获取剪贴板内容失败:', error.message);
      return null;
    }
  }

  setContent(content, type) {
    try {
      if (type === 'text') {
        clipboard.writeText(content);
        this.lastClipboardContent = content;
      } else if (type === 'image') {
        const { nativeImage } = require('electron');
        const image = nativeImage.createFromDataURL(content);
        clipboard.writeImage(image);
        this.lastClipboardContent = content;
      }
      
      Logger.debug(`已设置剪贴板内容: ${type}`);
      return true;
    } catch (error) {
      Logger.error('设置剪贴板内容失败:', error.message);
      return false;
    }
  }

  reset() {
    this.lastClipboardContent = '';
    this.consecutiveNoChange = 0;
    Logger.debug('剪贴板监控状态已重置');
  }

  getStats() {
    return {
      isWatching: this.isWatching,
      consecutiveNoChange: this.consecutiveNoChange,
      lastContent: this.lastClipboardContent ? 
        (this.lastClipboardContent.length > 50 ? 
          this.lastClipboardContent.substring(0, 50) + '...' : 
          this.lastClipboardContent) : null
    };
  }
}

module.exports = ClipboardWatcher; 