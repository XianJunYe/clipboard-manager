const { ipcRenderer } = require('electron');

let clipboardHistory = [];
let selectedIndex = -1; // 不选择任何项

// 接收剪贴板历史记录
ipcRenderer.on('clipboard-history', (event, history) => {
    clipboardHistory = history;
    renderItems();
});

function renderItems() {
    const itemList = document.getElementById('itemList');
    
    if (clipboardHistory.length === 0) {
        itemList.innerHTML = '<div class="empty-state">暂无剪贴板历史记录</div>';
        return;
    }

    let html = '';
    
    // 渲染前9条记录
    for (let i = 0; i < Math.min(9, clipboardHistory.length); i++) {
        const item = clipboardHistory[i];
        const isSelected = i === selectedIndex;
        
        html += `
            <div class="item ${isSelected ? 'selected' : ''}" data-index="${i}">
                <div class="item-number">${i + 1}</div>
                ${item.type === 'image' ? 
                    `<img src="${item.content}" class="item-image" alt="图片">` : 
                    ''
                }
                <div class="item-content">
                    <div class="item-preview">${item.preview}</div>
                    <div class="item-type">${item.type === 'text' ? '文本' : '图片'}</div>
                </div>
            </div>
        `;
    }

    // 如果有更多记录，添加"更多"选项
    if (clipboardHistory.length > 9) {
        html += `
            <div class="item more-item" data-index="more">
                <div class="item-number">0</div>
                <div class="item-content">
                    <div class="item-preview">查看更多记录 (${clipboardHistory.length - 9} 条)</div>
                    <div class="item-type">更多选项</div>
                </div>
            </div>
        `;
    }

    itemList.innerHTML = html;

    // 添加点击事件
    document.querySelectorAll('.item').forEach(item => {
        item.addEventListener('click', () => {
            const index = item.dataset.index;
            if (index === 'more') {
                showDetailWindow();
            } else {
                selectItem(parseInt(index));
            }
        });
    });
}

function selectItem(index) {
    if (index >= 0 && index < clipboardHistory.length) {
        const item = clipboardHistory[index];
        ipcRenderer.invoke('paste-item', item.content, item.type).then(() => {
            closeWindow();
        });
    }
}

function showDetailWindow() {
    ipcRenderer.invoke('show-detail');
    closeWindow();
}

function closeWindow() {
    ipcRenderer.invoke('close-quick-select');
}

// 简化版本：由于使用全局快捷键，不需要窗口内的键盘事件处理 