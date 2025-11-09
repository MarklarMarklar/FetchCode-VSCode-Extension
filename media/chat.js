(function() {
    const vscode = acquireVsCodeApi();
    
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const agentSelector = document.getElementById('agentSelector');
    
    let currentStreamingMessage = null;

    // Handle sending messages
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to UI
        addMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Send to extension
        vscode.postMessage({
            type: 'sendMessage',
            content: message
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Clear chat history?')) {
            chatMessages.innerHTML = '';
            vscode.postMessage({ type: 'clearHistory' });
        }
    });

    agentSelector.addEventListener('change', (e) => {
        vscode.postMessage({
            type: 'switchAgent',
            agent: e.target.value
        });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'assistantTyping':
                showTypingIndicator();
                break;
            case 'streamToken':
                updateStreamingMessage(message.token);
                break;
            case 'progress':
                showProgress(message.text);
                break;
            case 'messageComplete':
                completeStreamingMessage(message.content);
                removeProgressIndicator();
                sendBtn.disabled = false;
                break;
            case 'error':
                removeTypingIndicator();
                removeProgressIndicator();
                showError(message.error);
                sendBtn.disabled = false;
                break;
            case 'historyCleared':
                chatMessages.innerHTML = '';
                break;
            case 'agentSwitched':
                showNotification(`Switched to ${message.agent} agent`);
                break;
            case 'injectMessage':
                chatInput.value = message.message;
                chatInput.focus();
                break;
            case 'workspaceInfo':
                updateWorkspaceInfo(message.workspacePath);
                break;
        }
    });

    function updateWorkspaceInfo(workspacePath) {
        let workspaceDiv = document.getElementById('workspaceInfo');
        if (!workspaceDiv) {
            workspaceDiv = document.createElement('div');
            workspaceDiv.id = 'workspaceInfo';
            workspaceDiv.className = 'workspace-info';
            const header = document.querySelector('.chat-header');
            header.parentNode.insertBefore(workspaceDiv, header.nextSibling);
        }
        workspaceDiv.textContent = `📁 Working directory: ${workspacePath}`;
        workspaceDiv.title = workspacePath;
    }

    // Notify extension that webview is ready
    vscode.postMessage({ type: 'ready' });

    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const roleLabel = document.createElement('div');
        roleLabel.className = 'message-role';
        roleLabel.textContent = role === 'user' ? 'You' : 'FetchCoder';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = renderMarkdown(content);
        
        messageDiv.appendChild(roleLabel);
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
        return messageDiv;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function updateStreamingMessage(token) {
        if (!currentStreamingMessage) {
            removeTypingIndicator();
            currentStreamingMessage = addMessage('assistant', token);
        } else {
            const contentDiv = currentStreamingMessage.querySelector('.message-content');
            const currentText = contentDiv.getAttribute('data-raw') || '';
            const newText = currentText + token;
            contentDiv.setAttribute('data-raw', newText);
            contentDiv.innerHTML = renderMarkdown(newText);
            scrollToBottom();
        }
    }

    function completeStreamingMessage(content) {
        if (currentStreamingMessage) {
            const contentDiv = currentStreamingMessage.querySelector('.message-content');
            contentDiv.innerHTML = renderMarkdown(content);
            currentStreamingMessage = null;
        } else {
            removeTypingIndicator();
            addMessage('assistant', content);
        }
        scrollToBottom();
    }

    function showError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = '⚠️ ' + error;
        chatMessages.appendChild(errorDiv);
        scrollToBottom();
    }

    function showNotification(text) {
        const notifDiv = document.createElement('div');
        notifDiv.className = 'message-content';
        notifDiv.style.opacity = '0.7';
        notifDiv.style.fontStyle = 'italic';
        notifDiv.textContent = text;
        chatMessages.appendChild(notifDiv);
        scrollToBottom();
    }

    function showProgress(text) {
        // Skip empty or very short messages
        if (!text || text.trim().length < 3) return;
        
        // Determine icon based on action type
        let icon = '🔧';
        const lowerText = text.toLowerCase();
        if (lowerText.includes('write') || lowerText.includes('creat')) {
            icon = '📝';
        } else if (lowerText.includes('read') || lowerText.includes('list') || lowerText.includes('ls')) {
            icon = '📖';
        } else if (lowerText.includes('bash') || lowerText.includes('python') || lowerText.includes('node')) {
            icon = '⚙️';
        } else if (lowerText.includes('search') || lowerText.includes('grep')) {
            icon = '🔍';
        } else if (lowerText.includes('delet') || lowerText.includes('remov')) {
            icon = '🗑️';
        }
        
        // Create a new progress message for each tool call/action
        const progressDiv = document.createElement('div');
        progressDiv.className = 'progress-message';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'progress-icon';
        iconSpan.textContent = icon;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'progress-text';
        textSpan.textContent = text;
        
        progressDiv.appendChild(iconSpan);
        progressDiv.appendChild(textSpan);
        chatMessages.appendChild(progressDiv);
        scrollToBottom();
    }

    function removeProgressIndicator() {
        // No longer needed - progress messages stay in chat
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Simple markdown renderer
    function renderMarkdown(text) {
        if (!text) return '';
        
        // Escape HTML
        text = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');

        // Code blocks (```language\ncode\n```)
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
        });

        // Inline code (`code`)
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold (**text**)
        text = text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');

        // Italic (*text*)
        text = text.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

        // Links ([text](url))
        text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

        // Paragraphs
        text = text.split('\n\n').map(para => {
            if (para.trim().startsWith('<pre>') || para.trim().startsWith('<code>')) {
                return para;
            }
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return text;
    }
})();

