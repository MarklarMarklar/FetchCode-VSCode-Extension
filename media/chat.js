(function() {
    const vscode = acquireVsCodeApi();
    
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const agentSelector = document.getElementById('agentSelector');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const attachFolderBtn = document.getElementById('attachFolderBtn');
    const attachFileBtnBottom = document.getElementById('attachFileBtnBottom');
    const attachFolderBtnBottom = document.getElementById('attachFolderBtnBottom');
    const attachmentsContainer = document.getElementById('attachmentsContainer');
    const attachmentsList = document.getElementById('attachmentsList');
    
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

    // Attach file/folder button handlers
    attachFileBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'attachFile' });
    });

    attachFolderBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'attachFolder' });
    });

    attachFileBtnBottom.addEventListener('click', () => {
        vscode.postMessage({ type: 'attachFile' });
    });

    attachFolderBtnBottom.addEventListener('click', () => {
        vscode.postMessage({ type: 'attachFolder' });
    });

    // Drag and drop support
    const chatContainer = document.querySelector('.chat-container');
    let dragCounter = 0; // Track nested drag events

    // Prevent default drag behaviors on the whole container - use capture phase
    chatContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, true);

    chatContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        
        // Add visual feedback
        if (dragCounter === 1) {
            chatContainer.classList.add('drag-active');
        }
    }, true);

    chatContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        
        // Remove visual feedback when fully leaving
        if (dragCounter === 0) {
            chatContainer.classList.remove('drag-active');
        }
    }, true);

    chatContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        chatContainer.classList.remove('drag-active');
        
        // Get the dropped items
        const dataTransfer = e.dataTransfer;
        
        // Try multiple methods to extract URIs
        let uris = [];
        
        // Method 1: Try text/uri-list
        if (dataTransfer.types.includes('text/uri-list')) {
            const uriList = dataTransfer.getData('text/uri-list');
            if (uriList) {
                uris = uriList.split('\n').filter(uri => uri.trim() && !uri.startsWith('#'));
                if (uris.length > 0) {
                    vscode.postMessage({
                        type: 'dropFiles',
                        uris: uris
                    });
                    return;
                }
            }
        }
        
        // Method 2: Try items API
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            const items = Array.from(dataTransfer.items);
            let processedCount = 0;
            
            items.forEach(item => {
                if (item.kind === 'string' && item.type === 'text/uri-list') {
                    item.getAsString((uri) => {
                        if (uri && uri.trim()) {
                            uris.push(uri.trim());
                        }
                        processedCount++;
                        
                        // When all items are processed, send to extension
                        if (processedCount === items.length && uris.length > 0) {
                            vscode.postMessage({
                                type: 'dropFiles',
                                uris: uris
                            });
                            // Don't show processing message - the extension will show proper notifications
                        }
                    });
                } else {
                    processedCount++;
                }
            });
            
            if (processedCount === items.length && uris.length === 0) {
                showNotification('Could not process dropped items. Try using the attach buttons instead.');
            }
        }
    }, true);

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
            case 'updateAttachments':
                updateAttachmentsUI(message.attachedFiles, message.attachedFolders);
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

    function updateAttachmentsUI(attachedFiles, attachedFolders) {
        // Show/hide attachments container
        const hasAttachments = attachedFiles.length > 0 || attachedFolders.length > 0;
        attachmentsContainer.style.display = hasAttachments ? 'block' : 'none';

        // Clear existing attachments
        attachmentsList.innerHTML = '';

        // Add folders
        attachedFolders.forEach(folder => {
            const item = createAttachmentItem('📁', folder, true);
            attachmentsList.appendChild(item);
        });

        // Add files
        attachedFiles.forEach(file => {
            const item = createAttachmentItem('📄', file, false);
            attachmentsList.appendChild(item);
        });
    }

    function createAttachmentItem(icon, path, isFolder) {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'attachment-icon';
        iconSpan.textContent = icon;
        
        const pathSpan = document.createElement('span');
        pathSpan.className = 'attachment-path';
        pathSpan.textContent = path;
        pathSpan.title = path;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'attachment-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove';
        removeBtn.onclick = () => {
            vscode.postMessage({
                type: 'removeAttachment',
                path: path,
                isFolder: isFolder
            });
        };
        
        item.appendChild(iconSpan);
        item.appendChild(pathSpan);
        item.appendChild(removeBtn);
        
        return item;
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

