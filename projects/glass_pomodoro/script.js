// --- State & Configuration ---
let config = {
  work: 25,
  short: 5,
  long: 15
};

let currentMode = 'work'; // 'work', 'short', 'long'
let timeLeft = config.work * 60;
let totalDuration = config.work * 60;
let timerId = null;
let isRunning = false;

// Stats & Tasks State
let stats = {
  completed: 0,
  streak: 0,
  focusMinutes: 0,
  lastActiveDate: null
};

let tasks = [];

// --- DOM Elements ---
const bodyEl = document.body;
const modeBtns = document.querySelectorAll('.mode-btn');
const timeDisplay = document.getElementById('time-display');
const sessionStatus = document.getElementById('session-status');
const startBtn = document.getElementById('start-btn');
const startIcon = document.getElementById('start-icon');
const startText = document.getElementById('start-text');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');

const completedCountEl = document.getElementById('completed-count');
const streakCountEl = document.getElementById('streak-count');
const focusTimeTotalEl = document.getElementById('focus-time-total');

const taskBtn = document.getElementById('task-btn');
const tasksModal = document.getElementById('tasks-modal');
const closeTasks = document.getElementById('close-tasks');
const newTaskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListEl = document.getElementById('task-list');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const settingWork = document.getElementById('setting-work');
const settingShort = document.getElementById('setting-short');
const settingLong = document.getElementById('setting-long');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const toastEl = document.getElementById('toast');

// --- SVG Ring Setup ---
const circleRadius = 116;
const circumference = 2 * Math.PI * circleRadius;
progressBar.style.strokeDasharray = circumference;
progressBar.style.strokeDashoffset = 0;

function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  progressBar.style.strokeDashoffset = offset;
}

// --- Audio Notification (Web Audio API Bell) ---
function playBellSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Play a gentle chime sequence
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + index * 0.12 + 0.8);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + index * 0.12);
      osc.stop(audioCtx.currentTime + index * 0.12 + 0.8);
    });
  } catch (e) {
    console.log('Audio context not supported or blocked', e);
  }
}

// --- Toast notification ---
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

// --- Load Data from localStorage ---
function loadData() {
  const savedConfig = localStorage.getItem('glass_pomodoro_config');
  if (savedConfig) {
    config = JSON.parse(savedConfig);
    settingWork.value = config.work;
    settingShort.value = config.short;
    settingLong.value = config.long;
  }

  const savedStats = localStorage.getItem('glass_pomodoro_stats');
  if (savedStats) {
    stats = JSON.parse(savedStats);
    
    // Check streak
    const today = new Date().toDateString();
    if (stats.lastActiveDate) {
      const lastDate = new Date(stats.lastActiveDate);
      const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        stats.streak = 0; // reset streak if missed a day
      }
    }
  }

  const savedTasks = localStorage.getItem('glass_pomodoro_tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }

  updateStatsDisplay();
  renderTasks();
}

function saveData() {
  localStorage.setItem('glass_pomodoro_config', JSON.stringify(config));
  localStorage.setItem('glass_pomodoro_stats', JSON.stringify(stats));
  localStorage.setItem('glass_pomodoro_tasks', JSON.stringify(tasks));
}

// --- Timer Logic ---
function switchMode(mode) {
  if (isRunning) {
    if (!confirm("Timer is currently running. Switch mode and reset timer?")) return;
    pauseTimer();
  }

  currentMode = mode;
  modeBtns.forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  bodyEl.className = `mode-${mode}`;

  if (mode === 'work') {
    totalDuration = config.work * 60;
    sessionStatus.textContent = "Focus Time";
  } else if (mode === 'short') {
    totalDuration = config.short * 60;
    sessionStatus.textContent = "Short Break";
  } else if (mode === 'long') {
    totalDuration = config.long * 60;
    sessionStatus.textContent = "Long Break";
  }

  timeLeft = totalDuration;
  updateDisplay();
}

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  timeDisplay.textContent = timeString;
  document.title = `${timeString} — GlassPomodoro`;

  const percent = ((totalDuration - timeLeft) / totalDuration) * 100;
  setProgress(percent);
}

function startTimer() {
  if (!timerId) {
    if (timeLeft <= 0) timeLeft = totalDuration;
    isRunning = true;
    startIcon.className = "fa-solid fa-pause";
    startText.textContent = "Pause Session";
    startBtn.style.background = "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)";
    
    timerId = setInterval(() => {
      timeLeft--;
      updateDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        playBellSound();
        handleTimerComplete();
      }
    }, 1000);
  }
}

function pauseTimer() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  startIcon.className = "fa-solid fa-play";
  startText.textContent = "Resume Session";
  startBtn.style.background = "";
  updateDisplay();
}

function resetTimer() {
  pauseTimer();
  if (currentMode === 'work') totalDuration = config.work * 60;
  else if (currentMode === 'short') totalDuration = config.short * 60;
  else if (currentMode === 'long') totalDuration = config.long * 60;
  
  timeLeft = totalDuration;
  updateDisplay();
  startText.textContent = "Start Focus";
}

function handleTimerComplete() {
  startIcon.className = "fa-solid fa-play";
  startText.textContent = "Start Focus";
  startBtn.style.background = "";

  const today = new Date().toDateString();

  if (currentMode === 'work') {
    stats.completed += 1;
    stats.focusMinutes += config.work;
    
    if (stats.lastActiveDate !== today) {
      if (!stats.lastActiveDate) {
        stats.streak = 1;
      } else {
        const lastDate = new Date(stats.lastActiveDate);
        const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.streak += 1;
        } else if (diffDays > 1) {
          stats.streak = 1;
        }
      }
      stats.lastActiveDate = today;
    }

    showToast("🎉 Focus session completed! Time for a break.");
    saveData();
    updateStatsDisplay();

    // Automatically switch to short break
    switchMode('short');
  } else {
    showToast("🔔 Break ended! Back to work.");
    switchMode('work');
  }
}

function updateStatsDisplay() {
  completedCountEl.textContent = stats.completed;
  streakCountEl.textContent = stats.streak;
  focusTimeTotalEl.textContent = `${stats.focusMinutes}m`;
}

// --- Task Manager Logic ---
function renderTasks() {
  taskListEl.innerHTML = '';
  if (tasks.length === 0) {
    taskListEl.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">No tasks yet. Add one above!</li>`;
    return;
  }

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <span>${escapeHtml(task.text)}</span>
      <div class="task-actions">
        <button class="task-check" onclick="toggleTask(${index})"><i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i></button>
        <button class="task-delete" onclick="deleteTask(${index})"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    taskListEl.appendChild(li);
  });
}

function addTask() {
  const text = newTaskInput.value.trim();
  if (!text) return;
  tasks.push({ text, completed: false });
  newTaskInput.value = '';
  saveData();
  renderTasks();
}

window.toggleTask = function(index) {
  tasks[index].completed = !tasks[index].completed;
  saveData();
  renderTasks();
};

window.deleteTask = function(index) {
  tasks.splice(index, 1);
  saveData();
  renderTasks();
};

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// --- Event Listeners ---

// Mode switches
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchMode(btn.dataset.mode);
  });
});

// Start/Pause Button
startBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

// Modals
taskBtn.addEventListener('click', () => tasksModal.classList.add('open'));
closeTasks.addEventListener('click', () => tasksModal.classList.remove('open'));

settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));

// Close modals on clicking outside
window.addEventListener('click', (e) => {
  if (e.target === tasksModal) tasksModal.classList.remove('open');
  if (e.target === settingsModal) settingsModal.classList.remove('open');
});

// Task adding
addTaskBtn.addEventListener('click', addTask);
newTaskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

// Settings saving
saveSettingsBtn.addEventListener('click', () => {
  const w = parseInt(settingWork.value);
  const s = parseInt(settingShort.value);
  const l = parseInt(settingLong.value);

  if (w > 0 && s > 0 && l > 0) {
    config.work = w;
    config.short = s;
    config.long = l;
    saveData();
    settingsModal.classList.remove('open');
    showToast("⚙️ Settings saved successfully!");
    resetTimer();
  } else {
    alert("Please enter valid positive numbers for all durations.");
  }
});

// Initialize on load
loadData();
updateDisplay();
