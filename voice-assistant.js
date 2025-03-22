// Voice Assistant Module

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.wakeWord = 'hey darling';
        this.conversationState = 'idle';
        this.pendingTask = {};
        this.chatHistory = [];
        this.initSpeechRecognition();
        this.initVoices();
        this.initDB();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = this.handleSpeechResult.bind(this);
            this.recognition.onerror = this.handleSpeechError.bind(this);
        } else {
            console.error('Speech recognition not supported');
        }
    }

    initVoices() {
        let voices = [];
        const setVoices = () => {
            voices = this.synthesis.getVoices();
            this.femaleVoice = voices.find(voice => voice.name.includes('female') || voice.name.includes('Female'));
        };

        setVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = setVoices;
        }
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.isListening = true;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.femaleVoice) {
            utterance.voice = this.femaleVoice;
        }
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
        this.synthesis.speak(utterance);
    }

    async parseDate(dateStr) {
        // More sophisticated date parsing
        const months = {
            'january': '01', 'jan': '01', 'february': '02', 'feb': '02', 'march': '03', 'mar': '03',
            'april': '04', 'apr': '04', 'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
            'august': '08', 'aug': '08', 'september': '09', 'sep': '09', 'october': '10', 'oct': '10',
            'november': '11', 'nov': '11', 'december': '12', 'dec': '12'
        };
        
        // Extract day, month, year from the string
        let day, month, year;
        
        // Check for month names
        for (const monthName in months) {
            if (dateStr.includes(monthName)) {
                month = months[monthName];
                break;
            }
        }
        
        // Extract day
        const dayMatch = dateStr.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
        if (dayMatch) {
            day = dayMatch[1].padStart(2, '0');
        }
        
        // Extract year
        const yearMatch = dateStr.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            year = yearMatch[1];
        } else {
            // Default to current year if not specified
            year = new Date().getFullYear();
        }
        
        // If we have day and month, construct a date
        if (day && month) {
            return `${year}-${month}-${day}`;
        }
        
        return null;
    }

    handleSpeechResult(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.toLowerCase())
            .join('');
        
        // Check for wake word if not already in conversation
        if (this.conversationState === 'idle' && transcript.includes(this.wakeWord)) {
            this.conversationState = 'active';
            this.speak('Yes, I\'m listening.');
            this.addMessageToChat('system', 'Darling Assistant activated');
            this.addMessageToChat('assistant', 'How can I help you today?');
            return;
        }
        
        // Process commands if in active conversation
        if (this.conversationState === 'active' && event.results[0].isFinal) {
            this.processCommand(transcript);
        }
    }

    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            // No speech detected, continue listening
            return;
        }
        
        if (this.conversationState === 'active') {
            this.addMessageToChat('system', 'Sorry, I had trouble hearing you.');
        }
    }

    async processCommand(transcript) {
        // Add user message to chat
        this.addMessageToChat('user', transcript);
        
        // Show thinking indicator
        const thinkingId = this.addThinkingIndicator();
        
        // Process different command types
        let response = '';
        
        // Task-related commands
        if (transcript.includes('add task') || transcript.includes('add a task') || transcript.includes('create task')) {
            const taskText = transcript.replace(/add (a )?task|create (a )?task/g, '').trim();
            if (taskText) {
                this.addTask(taskText);
                response = `I've added "${taskText}" to your task list.`;
            } else {
                response = 'What task would you like to add?';
                this.pendingTask = { action: 'add' };
            }
        } 
        else if (transcript.includes('complete task') || transcript.includes('mark task as done') || 
                 transcript.includes('mark as completed') || transcript.includes('finish task')) {
            const taskIndex = this.extractTaskIndex(transcript);
            if (taskIndex !== null) {
                this.completeTask(taskIndex);
                response = `I've marked task ${taskIndex + 1} as completed.`;
            } else {
                response = 'Which task would you like to mark as completed?';
                this.pendingTask = { action: 'complete' };
            }
        }
        else if (transcript.includes('delete task') || transcript.includes('remove task')) {
            const taskIndex = this.extractTaskIndex(transcript);
            if (taskIndex !== null) {
                this.deleteTask(taskIndex);
                response = `I've deleted task ${taskIndex + 1}.`;
            } else {
                response = 'Which task would you like to delete?';
                this.pendingTask = { action: 'delete' };
            }
        }
        else if (transcript.includes('show all tasks') || transcript.includes('list all tasks') || 
                 transcript.includes('show tasks') || transcript.includes('what are my tasks')) {
            this.filterTasks('all');
            response = 'Showing all tasks.';
        }
        else if (transcript.includes('show active tasks') || transcript.includes('show incomplete tasks')) {
            this.filterTasks('active');
            response = 'Showing active tasks.';
        }
        else if (transcript.includes('show completed tasks') || transcript.includes('show finished tasks')) {
            this.filterTasks('completed');
            response = 'Showing completed tasks.';
        }
        else if (transcript.includes('clear completed') || transcript.includes('remove completed tasks')) {
            this.clearCompletedTasks();
            response = 'I\'ve cleared all completed tasks.';
        }
        // Handle pending task actions
        else if (Object.keys(this.pendingTask).length > 0) {
            if (this.pendingTask.action === 'add') {
                this.addTask(transcript);
                response = `I've added "${transcript}" to your task list.`;
            } 
            else if (this.pendingTask.action === 'complete') {
                const taskIndex = this.extractTaskIndex(transcript);
                if (taskIndex !== null) {
                    this.completeTask(taskIndex);
                    response = `I've marked task ${taskIndex + 1} as completed.`;
                } else {
                    response = 'I couldn\'t identify which task to complete. Please try again with a task number.';
                }
            }
            else if (this.pendingTask.action === 'delete') {
                const taskIndex = this.extractTaskIndex(transcript);
                if (taskIndex !== null) {
                    this.deleteTask(taskIndex);
                    response = `I've deleted task ${taskIndex + 1}.`;
                } else {
                    response = 'I couldn\'t identify which task to delete. Please try again with a task number.';
                }
            }
            
            // Clear pending task
            this.pendingTask = {};
        }
        // Conversation commands
        else if (transcript.includes('hello') || transcript.includes('hi there')) {
            response = 'Hello! How can I help with your tasks today?';
        }
        else if (transcript.includes('thank you') || transcript.includes('thanks')) {
            response = 'You\'re welcome! Anything else you need help with?';
        }
        else if (transcript.includes('goodbye') || transcript.includes('bye') || 
                 transcript.includes('see you later')) {
            response = 'Goodbye! Have a great day!';
            this.conversationState = 'idle';
        }
        else if (transcript.includes('stop listening') || transcript.includes('stop assistant')) {
            response = 'I\'ll stop listening now. Say "Hey Darling" when you need me again.';
            this.conversationState = 'idle';
        }
        else {
            response = 'I\'m not sure how to help with that. You can ask me to add, complete, or delete tasks.';
        }
        
        // Remove thinking indicator and add assistant response
        this.removeThinkingIndicator(thinkingId);
        this.addMessageToChat('assistant', response);
        this.speak(response);
    }

    async processTextCommand(text) {
        // Process text commands (from chat input)
        let response = '';
        
        // Task-related commands
        if (text.includes('add task') || text.includes('add a task') || text.includes('create task')) {
            const taskText = text.replace(/add (a )?task|create (a )?task/g, '').trim();
            if (taskText) {
                this.addTask(taskText);
                response = `I've added "${taskText}" to your task list.`;
            } else {
                response = 'What task would you like to add?';
            }
        } 
        else if (text.includes('complete task') || text.includes('mark task as done')) {
            const taskIndex = this.extractTaskIndex(text);
            if (taskIndex !== null) {
                this.completeTask(taskIndex);
                response = `I've marked task ${taskIndex + 1} as completed.`;
            } else {
                response = 'Which task would you like to mark as completed? Please specify a task number.';
            }
        }
        else if (text.includes('delete task') || text.includes('remove task')) {
            const taskIndex = this.extractTaskIndex(text);
            if (taskIndex !== null) {
                this.deleteTask(taskIndex);
                response = `I've deleted task ${taskIndex + 1}.`;
            } else {
                response = 'Which task would you like to delete? Please specify a task number.';
            }
        }
        else if (text.includes('show all tasks') || text.includes('list all tasks') || 
                 text.includes('show tasks') || text.includes('what are my tasks')) {
            this.filterTasks('all');
            response = 'Showing all tasks.';
        }
        else if (text.includes('show active tasks') || text.includes('show incomplete tasks')) {
            this.filterTasks('active');
            response = 'Showing active tasks.';
        }
        else if (text.includes('show completed tasks') || text.includes('show finished tasks')) {
            this.filterTasks('completed');
            response = 'Showing completed tasks.';
        }
        else if (text.includes('clear completed') || text.includes('remove completed tasks')) {
            this.clearCompletedTasks();
            response = 'I\'ve cleared all completed tasks.';
        }
        // Conversation commands
        else if (text.includes('hello') || text.includes('hi there')) {
            response = 'Hello! How can I help with your tasks today?';
        }
        else if (text.includes('thank you') || text.includes('thanks')) {
            response = 'You\'re welcome! Anything else you need help with?';
        }
        else if (text.includes('goodbye') || text.includes('bye') || 
                 text.includes('see you later')) {
            response = 'Goodbye! Have a great day!';
        }
        else if (text.includes('help') || text.includes('what can you do')) {
            response = 'I can help you manage your tasks. Try saying:\n' +
                      '- "Add task [task description]"\n' +
                      '- "Complete task [number]"\n' +
                      '- "Delete task [number]"\n' +
                      '- "Show all/active/completed tasks"\n' +
                      '- "Clear completed tasks"';
        }
        else {
            response = 'I\'m not sure how to help with that. Type "help" to see what I can do.';
        }
        
        return response;
    }

    extractTaskIndex(text) {
        // Extract task number from text (1-based in speech, convert to 0-based for array)
        const numberMatch = text.match(/\b(\d+)\b/);
        if (numberMatch) {
            const taskNumber = parseInt(numberMatch[1]);
            return taskNumber > 0 ? taskNumber - 1 : null; // Convert to 0-based index
        }
        return null;
    }

    // Task management functions
    addTask(text) {
        const taskInput = document.getElementById('taskInput');
        taskInput.value = text;
        document.getElementById('addBtn').click();
    }
    
    completeTask(index) {
        const taskItems = document.querySelectorAll('.task-item');
        if (index >= 0 && index < taskItems.length) {
            const checkbox = taskItems[index].querySelector('.task-checkbox');
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
            }
        }
    }
    
    deleteTask(index) {
        const taskItems = document.querySelectorAll('.task-item');
        if (index >= 0 && index < taskItems.length) {
            const deleteBtn = taskItems[index].querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.click();
            }
        }
    }
    
    filterTasks(filter) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === filter) {
                btn.click();
            }
        });
    }
    
    clearCompletedTasks() {
        document.getElementById('clearCompletedBtn').click();
    }
    
    addMessageToChat(type, text) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to chat history
        this.chatHistory.push({ type, text });
    }
    
    addThinkingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message thinking';
        thinkingDiv.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return thinkingDiv.id = 'thinking-' + Date.now();
    }
    
    removeThinkingIndicator(id) {
        const thinkingDiv = document.getElementById(id);
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }
    
    initDB() {
        // Initialize local database for storing chat history
        // This is a placeholder for future implementation
    }
}

// Export the VoiceAssistant class for use in other modules
export default VoiceAssistant;