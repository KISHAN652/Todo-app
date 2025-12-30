const todoInput = document.getElementById('todo-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const totalCount = document.getElementById('total-count');
const completedCount = document.getElementById('completed-count');
const progressFill = document.getElementById('progress-fill');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const installBtn = document.getElementById('install-btn');

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

let todos = JSON.parse(localStorage.getItem('todos')) || [];

// Ensure all todos have IDs (Migration for old todos)
todos = todos.map(todo => {
    if (!todo.id) {
        todo.id = Math.random().toString(36).substr(2, 9) + Date.now().toString();
    }
    return todo;
});
saveTodos(); // Save the migrated IDs immediately


let currentFilter = 'all';
let draggedElement = null;

function renderTodos() {
    todoList.innerHTML = '';
    let filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        if (['personal', 'work', 'shopping', 'other'].includes(currentFilter)) return todo.category === currentFilter;
        return true;
    });

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredTodos = filteredTodos.filter(todo => todo.text.toLowerCase().includes(searchTerm));
    }

    filteredTodos.forEach((todo) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.draggable = true;
        li.dataset.id = todo.id;
        li.innerHTML = `
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleComplete('${todo.id}')">
                    <div class="todo-content">
                        <span class="todo-text">${todo.text}</span>
                        <div class="todo-meta">
                            <span class="priority-${todo.priority}">${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority</span> | 
                            ${todo.category.charAt(0).toUpperCase() + todo.category.slice(1)} | 
                            Due: ${todo.dueDate || 'No date'}
                        </div>
                    </div>
                    <div class="actions">
                        <button class="edit-btn" onclick="editTodo('${todo.id}')">Edit</button>
                        <button class="delete-btn" onclick="deleteTodo('${todo.id}')">Delete</button>
                    </div>
                `;
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        todoList.appendChild(li);
    });
    updateStats();
}

function addTodo() {
    const text = todoInput.value.trim();
    const category = categorySelect.value;
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;
    if (text) {
        const newTodo = {
            id: Date.now().toString(),
            text,
            category,
            priority,
            dueDate,
            completed: false
        };
        todos.push(newTodo);
        todoInput.value = '';
        dueDateInput.value = '';
        saveTodos();
        renderTodos();
    }
}

function toggleComplete(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newText = prompt('Edit todo:', todo.text);
        if (newText !== null && newText.trim()) {
            todo.text = newText.trim();
            saveTodos();
            renderTodos();
        }
    }
}

function deleteTodo(id) {
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderTodos();
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    totalCount.textContent = total;
    completedCount.textContent = completed;
    progressFill.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
}

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.todo-item');
    if (draggedElement && targetItem && draggedElement !== targetItem) {
        const draggedId = draggedElement.dataset.id;
        const targetId = targetItem.dataset.id;

        const draggedIndex = todos.findIndex(t => t.id === draggedId);
        const targetIndex = todos.findIndex(t => t.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedTodo = todos.splice(draggedIndex, 1)[0];
            todos.splice(targetIndex, 0, draggedTodo);
            saveTodos();
            renderTodos();
        }
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function exportTodos() {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'todos.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importTodos() {
    importInput.click();
}

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTodos = JSON.parse(e.target.result);
                todos = importedTodos;
                saveTodos();
                renderTodos();
                alert('Todos imported successfully!');
            } catch (error) {
                alert('Invalid file format.');
            }
        };
        reader.readAsText(file);
    }
});

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});
searchInput.addEventListener('input', renderTodos);
darkModeToggle.addEventListener('click', toggleDarkMode);
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});
exportBtn.addEventListener('click', exportTodos);
importBtn.addEventListener('click', importTodos);

// dark mode 
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    darkModeToggle.textContent = '☀️';
}

renderTodos();