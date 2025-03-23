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
        // Check for different speech recognition APIs
        if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else {
            console.error('Speech recognition not supported on this device');
            this.addMessageToChat('system', 'Speech recognition is not supported on your device. Please use text input instead.');
            return;
        }
        
        // Configure recognition settings
        this.recognition.continuous = true;
        this.recognition.interimResults = false; // Set to false for better Android compatibility
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        // Set up event handlers
        this.recognition.onresult = this.handleSpeechResult.bind(this);
        this.recognition.onerror = this.handleSpeechError.bind(this);
        this.recognition.onend = this.handleSpeechEnd.bind(this);
        
        console.log('Speech recognition initialized');
    }

    initVoices() {
        let voices = [];
        const setVoices = () => {
            voices = this.synthesis.getVoices();
            
            // Enhanced scoring system for female voice selection
            const scoredVoices = voices.map(voice => {
                let score = 0;
                const nameLower = voice.name.toLowerCase();
                
                // Stronger female voice detection
                if (nameLower.includes('female') || nameLower.includes('woman') || 
                    nameLower.includes('girl') || nameLower.includes('f ')) {
                    score += 20; // Increased priority
                }
                
                // Expanded list of common female voice names
                const femaleNames = [
                    'samantha', 'victoria', 'karen', 'moira', 'tessa', 'veena', 
                    'fiona', 'alice', 'lisa', 'amy', 'emma', 'sarah', 'zira',
                    'cortana', 'siri', 'alexa'
                ];
                
                if (femaleNames.some(name => nameLower.includes(name))) {
                    score += 15;
                }
                
                // Prefer English voices
                if (voice.lang && voice.lang.startsWith('en')) {
                    score += 10;
                }
                
                // Prefer high-quality voices
                if (nameLower.includes('google') || nameLower.includes('microsoft')) {
                    score += 8;
                }
                
                // Prefer native voices
                if (!nameLower.includes('remote') && !nameLower.includes('network')) {
                    score += 5;
                }
                
                return { voice, score };
            });
            
            // Sort by score (highest first)
            scoredVoices.sort((a, b) => b.score - a.score);
            
            // Select the highest scoring voice
            this.femaleVoice = scoredVoices.length > 0 ? scoredVoices[0].voice : null;
            
            // Fallback to first available voice if no suitable voice found
            if (!this.femaleVoice && voices.length > 0) {
                this.femaleVoice = voices[0];
            }
            
            console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
            console.log('Selected voice:', this.femaleVoice ? 
                `${this.femaleVoice.name} (${this.femaleVoice.lang})` : 'None');
            console.log('Voice score:', this.femaleVoice ? 
                scoredVoices[0].score : 'N/A');
        };
    
        // Try to set voices immediately
        setVoices();
        
        // Also set up event listener for when voices are loaded asynchronously
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = setVoices;
        }
    }

    startListening() {
        if (!this.recognition) {
            console.error('Speech recognition not initialized');
            return;
        }
        
        if (this.isListening) {
            console.log('Already listening');
            return;
        }
        
        try {
            console.log('Starting speech recognition...');
            this.recognition.start();
            this.isListening = true;
            
            // Update UI to show listening state
            const voiceBtn = document.querySelector('.voice-assistant-btn');
            if (voiceBtn) {
                voiceBtn.classList.add('listening');
            }
            
            // Safety timeout - if recognition doesn't trigger onend after 30 seconds,
            // restart it (prevents Android hanging issues)
            this.listeningTimeout = setTimeout(() => {
                console.log('Listening timeout - restarting recognition');
                this.stopListening();
                setTimeout(() => this.startListening(), 500);
            }, 30000);
            
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.isListening = false;
            
            // Try to reinitialize and restart after a delay
            setTimeout(() => {
                this.initSpeechRecognition();
                this.startListening();
            }, 1000);
        }
    }

    stopListening() {
        if (!this.recognition) {
            return;
        }
        
        if (!this.isListening) {
            return;
        }
        
        try {
            console.log('Stopping speech recognition...');
            this.recognition.stop();
            this.isListening = false;
            
            // Clear safety timeout
            if (this.listeningTimeout) {
                clearTimeout(this.listeningTimeout);
                this.listeningTimeout = null;
            }
            
            // Update UI to show not listening state
            const voiceBtn = document.querySelector('.voice-assistant-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('listening');
            }
            
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    speak(text) {
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice (female preferred)
        if (this.femaleVoice) {
            utterance.voice = this.femaleVoice;
        }
        
        // Enhanced voice characteristics optimization
        if (this.femaleVoice && this.femaleVoice.name) {
            const voiceName = this.femaleVoice.name.toLowerCase();
            
            // Default settings optimized for feminine voice
            let pitchSetting = 1.15;  // Slightly higher pitch
            let rateSetting = 0.98;   // Slightly slower for clarity
            
            // Fine-tuned settings based on voice type
            if (voiceName.includes('google')) {
                pitchSetting = 1.08;
                rateSetting = 1.0;
            } else if (voiceName.includes('microsoft')) {
                pitchSetting = 1.05;
                rateSetting = 0.95;
            } else if (voiceName.includes('apple')) {
                pitchSetting = 1.12;
                rateSetting = 0.97;
            }
            
            utterance.pitch = pitchSetting;
            utterance.rate = rateSetting;
        } else {
            // Optimized fallback settings
            utterance.pitch = 1.15;
            utterance.rate = 0.98;
        }
        
        utterance.volume = 1.0; // Full volume
        
        // Log voice being used
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'Default');
        console.log('Voice settings - Pitch:', utterance.pitch, 'Rate:', utterance.rate);
        
        // Add event handlers to track speech status
        utterance.onstart = () => {
            console.log('Speech started');
            // Temporarily pause recognition while speaking to prevent feedback loop
            if (this.isListening) {
                this.stopListening();
            }
            
            // Update UI to show speaking state
            const voiceBtn = document.querySelector('.voice-assistant-btn');
            if (voiceBtn) {
                voiceBtn.classList.add('speaking');
            }
        };
        
        utterance.onend = () => {
            console.log('Speech ended');
            
            // Update UI to show not speaking state
            const voiceBtn = document.querySelector('.voice-assistant-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('speaking');
            }
            
            // Resume listening after speaking is done with a slight delay
            // to prevent immediate recognition of background noise
            setTimeout(() => {
                if (this.conversationState === 'active' && !this.isListening) {
                    this.startListening();
                }
            }, 500); // Increased delay for better conversation flow
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            // Remove speaking state if error occurs
            const voiceBtn = document.querySelector('.voice-assistant-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('speaking');
            }
            
            // Resume listening if error occurs
            if (this.conversationState === 'active' && !this.isListening) {
                this.startListening();
            }
        };
        
        // Speak the text
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
        // Get the transcript from the speech recognition results
        let transcript = '';
        let isFinal = false;
        
        // Process results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript.toLowerCase();
            if (event.results[i].isFinal) {
                isFinal = true;
            }
        }
        
        // Log the transcript for debugging
        console.log('Transcript:', transcript, 'Final:', isFinal);
        
        // Reset consecutive errors counter since we got a result
        this.consecutiveErrors = 0;
        
        // Check for wake word if not already in conversation
        if (this.conversationState === 'idle') {
            // Use a more flexible wake word detection
            // This handles slight variations in pronunciation
            const wakeWordVariations = [
                this.wakeWord,
                this.wakeWord.replace(' ', ''),  // No space
                'hey darlin',                    // Common pronunciation variation
                'hay darling',                   // Accent variation
                'hey darleen',                   // Another variation
                'hi darling',                    // Another common variation
                'hello darling'                  // Formal variation
            ];
            
            const hasWakeWord = wakeWordVariations.some(variation => 
                transcript.includes(variation));
                
            if (hasWakeWord) {
                console.log('Wake word detected');
                this.conversationState = 'active';
                
                // Add visual feedback
                this.addMessageToChat('system', 'Darling Assistant activated');
                
                // Speak response and show in chat
                const response = 'Yes, I\'m listening. How can I help you today?';
                this.addMessageToChat('assistant', response);
                this.speak(response);
                
                // Clear the recognition and restart
                this.stopListening();
                setTimeout(() => this.startListening(), 800); // Longer delay for better user experience
                return;
            }
        }

    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        
        // Track consecutive errors to detect persistent problems
        if (!this.consecutiveErrors) this.consecutiveErrors = 0;
        this.consecutiveErrors++;
        
        // Handle different error types
        switch (event.error) {
            case 'no-speech':
                // No speech detected, silently restart listening without notification
                setTimeout(() => this.startListening(), 300);
                this.consecutiveErrors = 0; // Reset error counter for this common case
                return;
                
            case 'aborted':
                // Recognition was aborted, likely by our own code
                setTimeout(() => this.startListening(), 500);
                return;
                
            case 'audio-capture':
                this.addMessageToChat('system', 'I can\'t access your microphone. Please check your device settings.');
                break;
                
            case 'network':
                this.addMessageToChat('system', 'Network error occurred. Please check your connection.');
                break;
                
            case 'not-allowed':
            case 'service-not-allowed':
                this.addMessageToChat('system', 'Microphone access denied. Please enable microphone permissions.');
                break;
                
            default:
                // Only show error message if we're in active conversation
                if (this.conversationState === 'active') {
                    this.addMessageToChat('system', 'Sorry, I had trouble hearing you. Please try again.');
                }
                break;
        }
        
        // If we have too many consecutive errors, suggest troubleshooting
        if (this.consecutiveErrors > 5) {
            this.addMessageToChat('system', 'I\'m having trouble with speech recognition. You might want to try refreshing the page or using text input instead.');
            this.consecutiveErrors = 0; // Reset after notifying
        }
        
        // Attempt to restart listening after a short delay
        setTimeout(() => this.startListening(), 1000);
    }
    
    handleSpeechEnd() {
        console.log('Speech recognition ended');
        this.isListening = false;
        
        // Restart listening if we're in active conversation mode
        if (this.conversationState === 'active') {
            console.log('Restarting speech recognition...');
            setTimeout(() => this.startListening(), 500);
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
                
                // More varied and natural responses
                const responses = [
                    `I've added "${taskText}" to your task list.`,
                    `Task added: "${taskText}".`,
                    `"${taskText}" has been added to your tasks.`,
                    `Got it! "${taskText}" is now on your list.`
                ];
                response = responses[Math.floor(Math.random() * responses.length)];
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
                
                // More varied and natural responses
                const responses = [
                    `I've marked task ${taskIndex + 1} as completed.`,
                    `Task ${taskIndex + 1} is now complete.`,
                    `Great job finishing task ${taskIndex + 1}!`,
                    `Task ${taskIndex + 1} completed. Well done!`
                ];
                response = responses[Math.floor(Math.random() * responses.length)];
            } else {
                response = 'Which task would you like to mark as completed?';
                this.pendingTask = { action: 'complete' };
            }
        }
        else if (transcript.includes('delete task') || transcript.includes('remove task')) {
            const taskIndex = this.extractTaskIndex(transcript);
            if (taskIndex !== null) {
                this.deleteTask(taskIndex);
                
                // More varied and natural responses
                const responses = [
                    `I've deleted task ${taskIndex + 1}.`,
                    `Task ${taskIndex + 1} has been removed.`,
                    `I've removed task ${taskIndex + 1} from your list.`,
                    `Task ${taskIndex + 1} is now deleted.`
                ];
                response = responses[Math.floor(Math.random() * responses.length)];
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