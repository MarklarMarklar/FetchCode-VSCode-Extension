(function() {
    const vscode = acquireVsCodeApi();
    const changesList = document.getElementById('changesList');
    const clearBtn = document.getElementById('clearBtn');

    console.log('DiffPanel: diff.js loaded');

    clearBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'clearChanges' });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        console.log('DiffPanel webview received message:', message);
        if (message.type === 'updateChanges') {
            console.log('Rendering', message.changes.length, 'changes');
            renderChanges(message.changes);
        }
    });

    function renderChanges(changes) {
        console.log('renderChanges called with:', changes);
        if (changes.length === 0) {
            console.log('No changes to render, showing empty state');
            changesList.innerHTML = '<div class="empty-state">No changes yet. FetchCoder will track file modifications here.</div>';
            return;
        }

        console.log('Rendering', changes.length, 'changes to HTML');
        changesList.innerHTML = changes.map(change => {
            const icon = getOperationIcon(change.operation);
            const time = new Date(change.timestamp).toLocaleTimeString();
            return `
                <div class="change-item" data-file="${change.filePath}">
                    <div class="change-icon">${icon}</div>
                    <div class="change-details">
                        <div class="change-file">${change.filePath}</div>
                        <div class="change-meta">
                            <span class="change-operation ${change.operation}">${change.operation}</span>
                            <span class="change-time">${time}</span>
                        </div>
                    </div>
                    <button class="btn-view" data-filepath="${change.filePath}">View</button>
                </div>
            `;
        }).join('');
        
        // Attach event listeners to all View buttons
        const viewButtons = changesList.querySelectorAll('.btn-view');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filePath = button.getAttribute('data-filepath');
                console.log('View button clicked for:', filePath);
                viewDiff(filePath);
            });
        });
    }

    function getOperationIcon(operation) {
        switch (operation) {
            case 'created': return '✨';
            case 'modified': return '📝';
            case 'deleted': return '🗑️';
            default: return '📄';
        }
    }

    function viewDiff(filePath) {
        console.log('viewDiff called for:', filePath);
        vscode.postMessage({ type: 'viewDiff', filePath });
    }

    // Notify extension that webview is ready
    console.log('DiffPanel webview: Sending ready signal');
    vscode.postMessage({ type: 'ready' });
})();

