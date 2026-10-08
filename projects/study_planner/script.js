// --- State & Data ---
let tasks = [
  { id: 1, title: 'Complete Calculus Problem Set #3', subject: 'Mathematics', priority: 'high', dueDate: '2025-05-15', completed: false },
  { id: 2, title: 'Build React Component Architecture', subject: 'Computer Science', priority: 'medium', dueDate: '2025-05-18', completed: false },
  { id: 3, title: 'Read Chapter 6: Electromagnetism', subject: 'Physics', priority: 'low', dueDate: '2025-05-20', completed: true }
];

let currentFilter = 'all';

// --- DOM Elements ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskSubjectSelect = document.getElementById('task-subject');
const taskPrioritySelect = document.getElementById('task-priority');
const taskDateInput = document.getElementById('task-date');
const tasksContainer = document.getElementById('tasks-container');
const searchInput = document.getElementById('search-input');
const totalTasksStat = document.getElementById('total-tasks-stat');
const completedTasksStat = document.getElementById('completed-tasks-stat');

// Set default date to today
document.getElementById('task-date').valueAsDate = new Date();

// --- Load/Save localStorage ---
function loadData() {
  const saved = localStorage.getItem('study_pulse_tasks');
  if (saved) {
    tasks = JSON.parse(saved);
  }
  renderTasks();
}

function saveData() {
  localStorage.setItem('study_pulse_tasks', JSON.stringify(tasks));
  updateStats();
}

// --- Task CRUD Operations ---
function handleAddTask(e) {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const subject = taskSubjectSelect.value;
  const priority = taskPrioritySelect.value;
  const dueDate = taskDateInput.value;

  if (!title) return;

  const newTask = {
    id: Date.now(),
    title,
    subject,
    priority,
    dueDate,
    completed: false
  };

  tasks.unshift(newTask);
  saveData();
  renderTasks();
  taskTitleInput.value = '';
}

window.toggleTaskComplete = function(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveData();
    renderTasks();
  }
};

window.deleteTask = function(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveData();
  renderTasks();
};

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

// --- Render Tasks ---
function renderTasks() {
  const query = searchInput.value.toLowerCase();
  
  let filtered = tasks.filter(task => {
    const matchesQuery = task.title.toLowerCase().includes(query) || task.subject.toLowerCase().includes(query);
    if (!matchesQuery) return false;
    
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });

  if (filtered.length === 0) {
    tasksContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-list"></i>
        <h3>No study tasks found</h3>
        <p>Add a new task using the sidebar form to get started.</p>
      </div>
    `;
    updateStats();
    return;
  }

  tasksContainer.innerHTML = filtered.map(task => {
    let priorityBadgeClass = 'badge-priority-med';
    if (task.priority === 'high') priorityBadgeClass = 'badge-priority-high';
    if (task.priority === 'low') priorityBadgeClass = 'badge-priority-low';

    // Format Date nicely
    const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="task-card ${task.completed ? 'completed' : ''}">
        <div class="task-left">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete(${task.id})">
          <div class="task-info">
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <div class="task-meta">
              <span class="badge badge-subject">${task.subject}</span>
              <span class="badge ${priorityBadgeClass}">${task.priority.toUpperCase()}</span>
              <span><i class="fa-regular fa-calendar"></i> Due: ${formattedDate}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn delete" onclick="deleteTask(${task.id})" title="Delete Task"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    `;
  }).join('');

  updateStats();
}

function updateStats() {
  totalTasksStat.textContent = tasks.length;
  completedTasksStat.textContent = tasks.filter(t => t.completed).length;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// --- Mini Focus Timer Widget ---
let miniTimeLeft = 25 * 60;
let miniTimerId = null;
let miniIsRunning = false;
const miniTimeDisplay = document.getElementById('mini-time');
const miniStartBtn = document.getElementById('mini-start-btn');

function updateMiniTimerDisplay() {
  const mins = Math.floor(miniTimeLeft / 60);
  const secs = miniTimeLeft % 60;
  miniTimeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toggleMiniTimer() {
  if (miniIsRunning) {
    clearInterval(miniTimerId);
    miniTimerId = null;
    miniIsRunning = false;
    miniStartBtn.textContent = 'Start';
  } else {
    miniIsRunning = true;
    miniStartBtn.textContent = 'Pause';
    miniTimerId = setInterval(() => {
      miniTimeLeft--;
      updateMiniTimerDisplay();
      if (miniTimeLeft <= 0) {
        clearInterval(miniTimerId);
        miniTimerId = null;
        miniIsRunning = false;
        miniStartBtn.textContent = 'Start';
        alert('Pomodoro session completed! Take a break.');
        miniTimeLeft = 25 * 60;
        updateMiniTimerDisplay();
      }
    }, 1000);
  }
}

function resetMiniTimer() {
  clearInterval(miniTimerId);
  miniTimerId = null;
  miniIsRunning = false;
  miniStartBtn.textContent = 'Start';
  miniTimeLeft = 25 * 60;
  updateMiniTimerDisplay();
}

// Initialize
loadData();
updateMiniTimerDisplay();
