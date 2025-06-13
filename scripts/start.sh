#!/bin/bash

# 剪贴板管理器启动脚本

echo ""
echo "🚀 剪贴板管理器启动检查..."
echo ""

# 检查是否已有进程在运行
if pgrep -f "clipboard-manager" > /dev/null; then
    echo "✅ 检测结果：应用已在后台运行"
    echo ""
    echo "📋 应用状态：正常运行中"
    echo "⌨️  快捷键：Command+Shift+V 打开剪贴板选择"
    echo "🖱️  托盘：点击菜单栏右上角的图标"
    echo "🔄 更新：右键托盘图标查看菜单"
    echo ""
    echo "💡 无需重复启动，应用已为您准备就绪！"
    echo ""
    
    # 询问用户是否要显示剪贴板
    read -p "是否现在打开剪贴板选择窗口？(y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📋 正在打开剪贴板选择窗口..."
        # 这里可以通过发送信号或其他方式触发显示
        # 暂时使用启动新实例的方式，会被单实例检测拦截并显示窗口
        npm start > /dev/null 2>&1 &
        echo "✅ 已触发剪贴板窗口显示"
    else
        echo "👍 好的，应用继续在后台运行"
    fi
    echo ""
    exit 0
fi

# 启动应用
echo "🔧 首次启动，正在初始化应用..."
echo ""
npm start 