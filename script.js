class TaskManager {
    constructor() {
        this.tasks = [];
        this.filter = 'all';
        this.setupEventListeners();
        this.setupNotifications();
        this.loadTasks();
        this.checkDeadlines();
    }

    setupEventListeners() {
        document.getElementById('addTask').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        document.getElementById('enableNotifications').addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        // Filter buttons
        document.getElementById('showAll').addEventListener('click', () => this.setFilter('all'));
        document.getElementById('showPending').addEventListener('click', () => this.setFilter('pending'));
        document.getElementById('showCompleted').addEventListener('click', () => this.setFilter('completed'));
    }

    setFilter(filter) {
        this.filter = filter;
        document.querySelectorAll('.filter-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`show${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
        this.renderTasks();
    }

    async setupNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.permission;
            const button = document.getElementById('enableNotifications');
            
            if (permission === 'granted') {
                button.textContent = 'Notifications Enabled';
                button.disabled = true;
            } else if (permission === 'denied') {
                button.textContent = 'Notifications Blocked';
                button.disabled = true;
            }
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.setupNotifications();
                this.showNotification('Notifications Enabled', 'You will now receive task reminders');
            }
        }
    }

    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    checkDeadlines() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(task => {
                if (!task.completed && !task.reminder_shown) {
                    const deadline = new Date(task.deadline);
                    const timeDiff = deadline.getTime() - now.getTime();
                    const minutesUntilDeadline = Math.floor(timeDiff / (1000 * 60));

                    if (minutesUntilDeadline <= 30 && minutesUntilDeadline > 0) {
                        this.showNotification('Task Due Soon', 
                            `"${task.title}" is due in ${minutesUntilDeadline} minutes!`);
                        task.reminder_shown = true;
                    }
                }
            });
        }, 60000); // Check every minute
    }

    async loadTasks() {
        try {
            console.log('Loading tasks...');
            const response = await fetch('http://localhost:5000/api/tasks');
            console.log('Response:', response);
            this.tasks = await response.json();
            console.log('Loaded tasks:', this.tasks);
            this.renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async addTask() {
        const input = document.getElementById('taskInput');
        const deadlineInput = document.getElementById('deadlineInput');
        const taskText = input.value.trim();
        const deadlineValue = deadlineInput.value;
        
        console.log('Adding task:', { taskText, deadlineValue });
        
        if (taskText && deadlineValue) {
            try {
                // Convert the datetime-local value to a proper date string
                const deadline = new Date(deadlineValue).toISOString();
                console.log('Formatted deadline:', deadline);

                const response = await fetch('http://localhost:5000/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: taskText,
                        deadline: deadline
                    })
                });
                console.log('Add task response:', response);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const task = await response.json();
                console.log('Added task:', task);
                
                if (task.error) {
                    console.error('Server error:', task.error);
                    return;
                }
                
                this.tasks.push(task);
                this.renderTasks();
                this.showNotification('New Task Added', taskText);
                
                input.value = '';
                deadlineInput.value = '';
            } catch (error) {
                console.error('Error adding task:', error);
            }
        } else {
            console.log('Invalid input:', { taskText, deadlineValue });
        }
    }

    async completeTask(taskId) {
        console.log('Completing task:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        completed: task.completed
                    })
                });
                console.log('Complete task response:', response);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.renderTasks();
                
                if (task.completed) {
                    this.showNotification('Task Completed', task.title);
                }
            } catch (error) {
                console.error('Error completing task:', error);
            }
        }
    }

    async deleteTask(taskId) {
        console.log('Deleting task:', taskId);
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const task = this.tasks[taskIndex];
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
                    method: 'DELETE'
                });
                console.log('Delete task response:', response);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.tasks.splice(taskIndex, 1);
                this.renderTasks();
                this.showNotification('Task Deleted', task.title);
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    }

    renderTasks() {
        console.log('Rendering tasks:', this.tasks);
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        const filteredTasks = this.tasks.filter(task => {
            if (this.filter === 'pending') return !task.completed;
            if (this.filter === 'completed') return task.completed;
            return true;
        });

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const content = document.createElement('div');
            content.className = 'task-content';

            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title;

            const deadline = document.createElement('div');
            deadline.className = 'task-deadline';
            const deadlineDate = new Date(task.deadline);
            const isUrgent = !task.completed && deadlineDate - new Date() < 24 * 60 * 60 * 1000;
            if (isUrgent) deadline.classList.add('urgent');
            deadline.textContent = `Due: ${deadlineDate.toLocaleString()}`;

            content.appendChild(title);
            content.appendChild(deadline);

            const actions = document.createElement('div');
            actions.className = 'task-actions';

            const completeBtn = document.createElement('button');
            completeBtn.className = 'complete-btn';
            completeBtn.textContent = task.completed ? 'Undo' : 'Complete';
            completeBtn.onclick = () => this.completeTask(task.id);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteTask(task.id);

            actions.appendChild(completeBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(content);
            li.appendChild(actions);
            taskList.appendChild(li);
        });
    }
}

// Initialize Task Manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Task Manager...');
    new TaskManager();
});
