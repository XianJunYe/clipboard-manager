class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = process.env.NODE_ENV === 'development' ? 0 : 1;

  static debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log('🔍', message, ...args);
    }
  }

  static info(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log('ℹ️', message, ...args);
    }
  }

  static warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn('⚠️', message, ...args);
    }
  }

  static error(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error('❌', message, ...args);
    }
  }

  static success(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log('✅', message, ...args);
    }
  }

  static setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
  }
}

module.exports = Logger; 