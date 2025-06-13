const { app } = require('electron');
const Logger = require('./app/utils/Logger');
const { AppConfig } = require('./app/config/AppConfig');
const ClipboardManager = require('./app/managers/ClipboardManager');
const NotificationService = require('./app/services/NotificationService');

// 设置日志级别
const logLevel = AppConfig.get('logging.level');
Logger.setLevel(logLevel);

// 单实例检查
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果应用已经在运行，显示友好的退出信息
  Logger.info('');
  Logger.info('🚫 剪贴板管理器已在运行中');
  Logger.info('');
  Logger.info('📋 应用状态：后台运行中');
  Logger.info('⌨️  快捷键：Command+Shift+V 打开剪贴板选择');
  Logger.info('🖱️  托盘：点击菜单栏右上角的图标');
  Logger.info('');
  Logger.info('💡 无需重复启动，应用已在后台为您服务！');
  Logger.info('');
  
  // 直接退出，不显示通知（因为第一个实例会处理）
  app.quit();
} else {
  Logger.success('获得单实例锁，应用正常启动');
  
  // 当尝试启动第二个实例时，聚焦到第一个实例
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    Logger.info('');
    Logger.info('🔄 检测到重复启动尝试');
    Logger.info('🔔 显示系统通知提醒用户');
    Logger.info('💡 应用已在后台运行，无需重复启动');
    Logger.info('');
    
    // 只显示系统通知，不自动显示快速选择窗口
    showDuplicateStartupNotification();
  });
  
  // 初始化应用
  initializeApp();
}

// 显示重复启动通知的函数
function showDuplicateStartupNotification() {
  if (global.clipboardManager && global.clipboardManager.notificationService) {
    global.clipboardManager.notificationService.showDuplicateStartupNotification();
  } else {
    // 备用通知方案
    const notificationService = new NotificationService();
    notificationService.showDuplicateStartupNotification();
  }
}

// 初始化应用
async function initializeApp() {
  try {
    // 等待Electron准备就绪
    await app.whenReady();
    
    Logger.info('🚀 Electron应用已准备就绪');
    
    // 创建并初始化剪贴板管理器
    const clipboardManager = new ClipboardManager();
    await clipboardManager.init();
    
    // 设置全局引用，方便其他地方访问
    global.clipboardManager = clipboardManager;
    
    Logger.success('🎉 剪贴板管理器启动完成');
    Logger.info('使用快捷键 Command+Shift+V 打开剪贴板历史');
    
  } catch (error) {
    Logger.error('应用初始化失败:', error.message);
    Logger.error('详细错误:', error);
    
    // 显示错误通知
    const notificationService = new NotificationService();
    notificationService.showErrorNotification(`应用启动失败: ${error.message}`);
    
    // 延迟退出，让用户看到错误信息
    setTimeout(() => {
      app.quit();
    }, 3000);
  }
}

// 应用事件处理
app.on('window-all-closed', () => {
  // 在 macOS 上，应用应该保持活跃状态，即使所有窗口都关闭了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标时重新创建窗口
  if (global.clipboardManager) {
    global.clipboardManager.showQuickSelect();
  }
});

// 优雅退出处理
process.on('SIGINT', () => {
  Logger.info('收到 SIGINT 信号，正在优雅退出...');
  if (global.clipboardManager) {
    global.clipboardManager.cleanup();
  }
  app.quit();
});

process.on('SIGTERM', () => {
  Logger.info('收到 SIGTERM 信号，正在优雅退出...');
  if (global.clipboardManager) {
    global.clipboardManager.cleanup();
  }
  app.quit();
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  Logger.error('未捕获的异常:', error.message);
  Logger.error('堆栈:', error.stack);
  
  // 显示错误通知
  if (global.clipboardManager && global.clipboardManager.notificationService) {
    global.clipboardManager.notificationService.showErrorNotification(
      `应用出现异常: ${error.message}`
    );
  }
  
  // 延迟退出，让用户看到错误信息
  setTimeout(() => {
    app.quit();
  }, 2000);
});

// 未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('未处理的Promise拒绝:', reason);
  Logger.error('Promise:', promise);
});

// 导出模块（如果需要）
module.exports = {
  initializeApp,
  showDuplicateStartupNotification
}; 