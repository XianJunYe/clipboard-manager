#!/bin/bash

# 剪贴板管理器状态检查脚本

echo ""
echo "📋 剪贴板管理器状态检查"
echo "================================"

# 检查是否有进程在运行
if pgrep -f "clipboard-manager" > /dev/null; then
    echo "✅ 状态：正在运行"
    echo "🔧 进程：后台运行中"
    
    # 获取进程信息
    PID=$(pgrep -f "clipboard-manager" | head -1)
    echo "🆔 进程ID：$PID"
    
    # 检查运行时间
    if command -v ps > /dev/null; then
        RUNTIME=$(ps -o etime= -p $PID 2>/dev/null | tr -d ' ')
        if [ ! -z "$RUNTIME" ]; then
            echo "⏰ 运行时间：$RUNTIME"
        fi
    fi
    
    echo ""
    echo "📖 使用说明："
    echo "  ⌨️  Command+Shift+V - 打开剪贴板选择"
    echo "  🖱️  点击菜单栏托盘图标 - 查看菜单"
    echo "  🔄 右键托盘图标 - 更多选项"
    echo ""
    echo "🛠️  管理命令："
    echo "  npm run status - 查看状态（当前命令）"
    echo "  pkill -f clipboard-manager - 停止应用"
    echo "  npm start - 启动应用"
    
else
    echo "❌ 状态：未运行"
    echo "💡 提示：应用当前未在后台运行"
    echo ""
    echo "🚀 启动命令："
    echo "  npm start - 启动应用"
    echo "  npm run start-safe - 安全启动（带检测）"
fi

echo ""
echo "================================"
echo "" 