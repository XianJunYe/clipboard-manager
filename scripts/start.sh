#!/bin/bash

# 剪贴板管理器启动脚本

echo "🚀 启动剪贴板管理器..."

# 检查是否已有进程在运行
if pgrep -f "clipboard-manager" > /dev/null; then
    echo "📋 剪贴板管理器已在运行中"
    echo "💡 使用 Command+Shift+V 打开剪贴板选择窗口"
    echo "🔍 或点击菜单栏右上角的托盘图标"
    exit 0
fi

# 启动应用
echo "🔧 正在启动应用..."
npm start 