(function() {
    const vscode = acquireVsCodeApi();
    
    const composeInput = document.getElementById('composeInput');
    const composeBtn = document.getElementById('composeBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const responseSection = document.getElementById('responseSection');
    const responseText = document.getElementById('responseText');
    const changesSection = document.getElementById('changesSection');
    const changesList = document.getElementById('changesList');
    const acceptAllBtn = document.getElementById('acceptAllBtn');
    const rejectAllBtn = document.getElementById('rejectAllBtn');

    let currentChanges = [];

    composeBtn.addEventListener('click', () => {
        const prompt = composeInput.value.trim();
        if (!prompt) return;

        vscode.postMessage({
            type: 'compose',
            prompt: prompt
        });
    });

    acceptAllBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'acceptAll' });
    });

    rejectAllBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'rejectAll' });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'setPrompt':
                composeInput.value = message.prompt;
                break;
            case 'composing':
                showLoading();
                break;
            case 'response':
                hideLoading();
                showResponse(message.response);
                break;
            case 'changesReady':
                hideLoading();
                showChanges(message.changes);
                break;
            case 'error':
                hideLoading();
                showError(message.error);
                break;
            case 'changeApplied':
                markChangeApplied(message.index);
                break;
            case 'changeRejected':
                markChangeRejected(message.index);
                break;
            case 'allRejected':
                hideChanges();
                break;
        }
    });

    function showLoading() {
        composeBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');
        responseSection.classList.add('hidden');
        changesSection.classList.add('hidden');
    }

    function hideLoading() {
        composeBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
    }

    function showResponse(response) {
        responseText.textContent = response;
        responseSection.classList.remove('hidden');
        changesSection.classList.add('hidden');
    }

    function showChanges(changes) {
        currentChanges = changes;
        changesList.innerHTML = '';
        
        changes.forEach((change, index) => {
            const item = createChangeItem(change, index);
            changesList.appendChild(item);
        });

        responseSection.classList.add('hidden');
        changesSection.classList.remove('hidden');
    }

    function createChangeItem(change, index) {
        const div = document.createElement('div');
        div.className = 'change-item';
        div.dataset.index = index;

        const header = document.createElement('div');
        header.className = 'change-header';

        const info = document.createElement('div');
        info.className = 'change-info';

        const path = document.createElement('div');
        path.className = 'change-path';
        path.textContent = change.path;

        const meta = document.createElement('div');
        const actionSpan = document.createElement('span');
        actionSpan.className = `change-action ${change.action}`;
        actionSpan.textContent = change.action;

        const stats = document.createElement('span');
        stats.className = 'change-stats';
        if (change.action !== 'delete') {
            stats.textContent = `+${change.linesAdded} lines`;
        } else {
            stats.textContent = 'File will be deleted';
        }

        meta.appendChild(actionSpan);
        meta.appendChild(stats);

        info.appendChild(path);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'change-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-small';
        viewBtn.textContent = 'View Diff';
        viewBtn.onclick = () => {
            vscode.postMessage({
                type: 'viewDiff',
                index: index
            });
        };

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn-small btn-success';
        acceptBtn.textContent = 'Accept';
        acceptBtn.onclick = () => {
            vscode.postMessage({
                type: 'acceptChange',
                index: index
            });
        };

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn-small btn-danger';
        rejectBtn.textContent = 'Reject';
        rejectBtn.onclick = () => {
            vscode.postMessage({
                type: 'rejectChange',
                index: index
            });
        };

        actions.appendChild(viewBtn);
        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);

        header.appendChild(info);
        header.appendChild(actions);
        div.appendChild(header);

        return div;
    }

    function markChangeApplied(index) {
        const item = changesList.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('applied');
            const actions = item.querySelector('.change-actions');
            actions.innerHTML = '<span style="color: #28a745; font-weight: 600;">✓ Applied</span>';
        }
    }

    function markChangeRejected(index) {
        const item = changesList.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('rejected');
            const actions = item.querySelector('.change-actions');
            actions.innerHTML = '<span style="color: #dc3545; font-weight: 600;">✗ Rejected</span>';
        }
    }

    function hideChanges() {
        changesSection.classList.add('hidden');
    }

    function showError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = '⚠️ ' + error;
        
        responseSection.innerHTML = '';
        responseSection.appendChild(errorDiv);
        responseSection.classList.remove('hidden');
    }
})();

