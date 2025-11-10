(function() {
    const vscode = acquireVsCodeApi();
    
    const asi1ApiKeyInput = document.getElementById('asi1ApiKey');
    const agentverseApiKeyInput = document.getElementById('agentverseApiKey');
    const apiUrlInput = document.getElementById('apiUrl');
    const defaultAgentSelect = document.getElementById('defaultAgent');
    const autoContextFilesInput = document.getElementById('autoContextFiles');
    const streamResponsesCheck = document.getElementById('streamResponses');
    const enableInlineActionsCheck = document.getElementById('enableInlineActions');
    const saveBtn = document.getElementById('saveBtn');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load settings when webview is ready
    vscode.postMessage({ type: 'ready' });

    // Handle save button
    saveBtn.addEventListener('click', () => {
        const settings = {
            asi1ApiKey: asi1ApiKeyInput.value.trim(),
            agentverseApiKey: agentverseApiKeyInput.value.trim(),
            apiUrl: apiUrlInput.value.trim(),
            defaultAgent: defaultAgentSelect.value,
            autoContextFiles: parseInt(autoContextFilesInput.value, 10),
            streamResponses: streamResponsesCheck.checked,
            enableInlineActions: enableInlineActionsCheck.checked
        };

        // Disable button during save
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        vscode.postMessage({
            type: 'saveSettings',
            settings: settings
        });
    });

    // Handle test connection button
    testConnectionBtn.addEventListener('click', () => {
        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';
        
        showStatus('Testing connection...', 'info');
        
        vscode.postMessage({ type: 'testConnection' });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'settingsLoaded':
                loadSettings(message.settings);
                break;
            case 'saveSuccess':
                showStatus(message.message, 'success');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Settings';
                break;
            case 'saveError':
                showStatus('Error: ' + message.error, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Settings';
                break;
            case 'connectionSuccess':
                showStatus(message.message, 'success');
                testConnectionBtn.disabled = false;
                testConnectionBtn.textContent = 'Test Connection';
                break;
            case 'connectionError':
                showStatus('Connection failed: ' + message.error, 'error');
                testConnectionBtn.disabled = false;
                testConnectionBtn.textContent = 'Test Connection';
                break;
        }
    });

    function loadSettings(settings) {
        asi1ApiKeyInput.value = settings.asi1ApiKey || '';
        agentverseApiKeyInput.value = settings.agentverseApiKey || '';
        apiUrlInput.value = settings.apiUrl || 'http://localhost:3000';
        defaultAgentSelect.value = settings.defaultAgent || 'general';
        autoContextFilesInput.value = settings.autoContextFiles || 5;
        streamResponsesCheck.checked = settings.streamResponses !== false;
        enableInlineActionsCheck.checked = settings.enableInlineActions !== false;
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        
        // Clear status after 5 seconds for success/error messages
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = 'status-message';
            }, 5000);
        }
    }
})();


