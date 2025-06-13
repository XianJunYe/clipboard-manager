const { ipcRenderer } = require('electron');

let allClipboardHistory = [];
let filteredHistory = [];

// 接收剪贴板历史记录
ipcRenderer.on('clipboard-history', (event, history) => {
    allClipboardHistory = history;
    filteredHistory = [...history];
    renderItems();
    updateStats();
});

function renderItems() {
    const content = document.getElementById('content');
    
    if (filteredHistory.length === 0) {
        if (allClipboardHistory.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div>暂无剪贴板历史记录</div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="no-results">
                    未找到匹配的记录，请尝试其他搜索关键词
                </div>
            `;
        }
        return;
    }

    let html = '';
    
    filteredHistory.forEach((item, index) => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString('zh-CN');
        
        html += `
            <div class="item" data-index="${index}">
                <div class="item-header">
                    <span class="item-type ${item.type}">${item.type === 'text' ? '文本' : '图片'}</span>
                    <span class="item-time">${timeStr}</span>
                </div>
                <div class="item-content">
        `;
        
        if (item.type === 'text') {
            const isLong = item.content.length > 200;
            html += `
                <div class="item-text ${isLong ? 'collapsible' : ''}" id="text-${item.id}">
                    ${escapeHtml(item.content)}
                </div>
                ${isLong ? `<div class="expand-btn" onclick="toggleExpand('${item.id}')">展开全部</div>` : ''}
            `;
        } else {
            html += `<img src="${item.content}" class="item-image" alt="剪贴板图片">`;
        }
        
        html += `
                </div>
            </div>
        `;
    });

    content.innerHTML = html;

    // 添加点击事件
    document.querySelectorAll('.item').forEach((item, index) => {
        item.addEventListener('click', () => {
            const clipboardItem = filteredHistory[index];
            ipcRenderer.invoke('paste-item', clipboardItem.content, clipboardItem.type);
            
            // 提供视觉反馈
            item.style.background = '#e8f5e8';
            setTimeout(() => {
                item.style.background = 'white';
            }, 200);
        });
    });
}

function toggleExpand(itemId) {
    const textElement = document.getElementById(`text-${itemId}`);
    const expandBtn = textElement.nextElementSibling;
    
    if (textElement.classList.contains('expanded')) {
        textElement.classList.remove('expanded');
        expandBtn.textContent = '展开全部';
    } else {
        textElement.classList.add('expanded');
        expandBtn.textContent = '收起';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateStats() {
    const stats = document.getElementById('stats');
    if (filteredHistory.length === allClipboardHistory.length) {
        stats.textContent = `共 ${allClipboardHistory.length} 条记录`;
    } else {
        stats.textContent = `显示 ${filteredHistory.length} / ${allClipboardHistory.length} 条记录`;
    }
}

// 搜索功能
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        filteredHistory = [...allClipboardHistory];
    } else {
        filteredHistory = allClipboardHistory.filter(item => {
            if (item.type === 'text') {
                return item.content.toLowerCase().includes(query);
            }
            return false; // 图片暂时不支持搜索
        });
    }
    
    renderItems();
    updateStats();
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.metaKey && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
}); 