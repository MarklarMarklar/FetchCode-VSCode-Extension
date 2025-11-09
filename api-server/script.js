document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    const addMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.innerHTML = `<div class="message-content">${message}</div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
    };

    const handleUserInput = () => {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            userInput.value = '';
            // Simulate AI response
            setTimeout(() => {
                addMessage("Hello there! I'm ASI:One, an AI assistant. How can I help you?", 'ai');
            }, 1000);
        }
    };

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleUserInput();
        }
    });

    // Initial AI message
    addMessage("Hi, I'm ASI:One. How can I assist you today?", 'ai');
});