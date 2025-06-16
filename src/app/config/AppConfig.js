const CONFIG = {
  // 剪贴板相关配置
  clipboard: {
    checkInterval: 200, // 剪贴板检查间隔（毫秒）
    maxHistory: 50,     // 最大历史记录数
    deduplicateOnStart: true, // 启动时是否去重
    maxTextPreview: 100, // 文本预览最大长度
  },

  // UI相关配置
  ui: {
    quickSelectMaxItems: 9,  // 快速选择窗口最大显示项数
    windowShowDelay: 50,     // 窗口显示延迟（毫秒）
    pasteDelay: 5,           // 粘贴操作延迟（毫秒）
    restoreAppDelay: 50,     // 恢复应用焦点延迟（毫秒）
  },

  // 快捷键配置
  shortcuts: {
    toggleQuickSelect: process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V',
    closeWindow: 'Escape',
  },

  // 托盘相关配置
  tray: {
    iconPath: '../../../assets/a.png',
    iconSize: { width: 16, height: 16 },
    tooltip: '剪贴板管理器 - Command+Shift+V',
  },

  // 日志配置
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO',
    enableConsole: true,
  },

  // 更新配置
  updater: {
    autoCheck: true,
    checkInterval: 3600000, // 1小时检查一次更新
  },

  // 通知配置
  notifications: {
    enabled: true,
    silent: false,
    duplicateStartup: {
      title: '剪贴板管理器',
      body: '应用已在后台运行中。使用 Command+Shift+V 打开剪贴板，或点击此通知快速访问',
    },
  },

  // 性能配置
  performance: {
    maxConsecutiveNoChangeBeforeSlowdown: 5, // 连续无变化次数后降低检查频率
    maxCheckInterval: 2000, // 最大检查间隔（毫秒）
  },
};

class AppConfig {
  static get(path) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  static set(path, newValue) {
    const keys = path.split('.');
    let obj = CONFIG;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }
    
    obj[keys[keys.length - 1]] = newValue;
  }

  static getAll() {
    return CONFIG;
  }
}

module.exports = { AppConfig, CONFIG }; 