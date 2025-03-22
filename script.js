// Import voice assistant
import VoiceAssistant from './voice-assistant.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // App State
    let tasks = [];
    let currentFilter = 'all';
    let isOnline = navigator.onLine;
    
    // Check online status
    window.addEventListener('online', () => {
        isOnline = true;
        showToast('You are online');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showToast('You are offline. Changes will be saved locally.');
    });
    
    // Show toast message
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    // Load tasks from local storage
    function loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            renderTasks();
        }
    }
    
    // Save tasks to local storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Render tasks based on current filter
    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks;
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }
        
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) {
                li.classList.add('completed');
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTask(task.id));
            
            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = task.text;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => editTask(task.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            li.appendChild(checkbox);
            li.appendChild(taskText);
            li.appendChild(actionsDiv);
            
            taskList.appendChild(li);
        });
        
        updateTaskCount();
    }
    
    // Update task count
    function updateTaskCount() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        taskCount.textContent = `${activeTasks} task${activeTasks !== 1 ? 's' : ''} left`;
    }
    
    // Add new task
    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            const newTask = {
                id: Date.now(),
                text,
                completed: false
            };
            
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            
            taskInput.value = '';
            showToast('Task added');
        }
    }
    
    // Toggle task completion
    function toggleTask(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        
        saveTasks();
        renderTasks();
    }
    
    // Edit task
    function editTask(id) {
        const task = tasks.find(task => task.id === id);
        if (task) {
            const newText = prompt('Edit task:', task.text);
            if (newText !== null && newText.trim() !== '') {
                tasks = tasks.map(t => {
                    if (t.id === id) {
                        return { ...t, text: newText.trim() };
                    }
                    return t;
                });
                
                saveTasks();
                renderTasks();
                showToast('Task updated');
            }
        }
    }
    
    // Delete task
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        showToast('Task deleted');
    }
    
    // Clear completed tasks
    function clearCompleted() {
        if (tasks.some(task => task.completed)) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
            showToast('Completed tasks cleared');
        }
    }
    
    // Event Listeners
    addBtn.addEventListener('click', addTask);
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });
    
    // Initialize Voice Assistant
    const voiceAssistant = new VoiceAssistant();
    const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
    const chatContainer = document.getElementById('chatContainer');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');
    
    // Toggle voice assistant
    voiceAssistantBtn.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
        if (chatContainer.classList.contains('open')) {
            voiceAssistant.startListening();
            voiceAssistantBtn.classList.add('listening');
        } else {
            voiceAssistant.stopListening();
            voiceAssistantBtn.classList.remove('listening');
        }
    });
    
    // Close chat
    chatCloseBtn.addEventListener('click', () => {
        chatContainer.classList.remove('open');
        voiceAssistant.stopListening();
        voiceAssistantBtn.classList.remove('listening');
    });
    
    // Send message
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // Add user message to chat
            addMessageToChat('user', message);
            
            // Process message
            voiceAssistant.processTextCommand(message)
                .then(response => {
                    addMessageToChat('assistant', response);
                })
                .catch(error => {
                    console.error('Error processing message:', error);
                    addMessageToChat('system', 'Sorry, I couldn\'t process your request.');
                });
            
            chatInput.value = '';
        }
    }
    
    // Add message to chat
    function addMessageToChat(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Send message on button click
    chatSendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Initialize
    loadTasks();
    
    // Update network status indicator
    const networkStatus = document.querySelector('.network-status');
    function updateNetworkStatus() {
        if (navigator.onLine) {
            networkStatus.classList.remove('offline');
        } else {
            networkStatus.classList.add('offline');
        }
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
});