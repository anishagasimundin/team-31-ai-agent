// --- Default Students Data ---
let students = [
  { id: '101', name: 'Alex Johnson', status: 'Present' },
  { id: '102', name: 'Brenda Smith', status: 'Present' },
  { id: '103', name: 'Charles Davis', status: 'Absent' },
  { id: '104', name: 'Diana Evans', status: 'Present' },
  { id: '105', name: 'Ethan Foster', status: 'Absent' }
];

// Display current date
const options = { year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);

function loadData() {
  const saved = localStorage.getItem('attendance_students');
  if (saved) {
    students = JSON.parse(saved);
  }
  renderTable();
}

function saveData() {
  localStorage.setItem('attendance_students', JSON.stringify(students));
  updateStats();
}

// --- Render Table ---
function renderTable() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const tbody = document.getElementById('student-tbody');

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #555;">No students found.</td></tr>`;
    updateStats();
    return;
  }

  tbody.innerHTML = filtered.map(student => `
    <tr>
      <td>${student.id}</td>
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>
        <div class="status-btns">
          <button class="att-btn present ${student.status === 'Present' ? 'active' : ''}" onclick="setStatus('${student.id}', 'Present')">Present</button>
          <button class="att-btn absent ${student.status === 'Absent' ? 'active' : ''}" onclick="setStatus('${student.id}', 'Absent')">Absent</button>
        </div>
      </td>
      <td>
        <button class="action-icon" onclick="deleteStudent('${student.id}')">Delete</button>
      </td>
    </tr>
  `).join('');

  updateStats();
}

function setStatus(id, status) {
  const student = students.find(s => s.id === id);
  if (student) {
    student.status = status;
    saveData();
    renderTable();
  }
}

function markAll(status) {
  students.forEach(s => s.status = status);
  saveData();
  renderTable();
}

function updateStats() {
  const total = students.length;
  const present = students.filter(s => s.status === 'Present').length;
  const absent = students.filter(s => s.status === 'Absent').length;

  document.getElementById('total-count').textContent = total;
  document.getElementById('present-count').textContent = present;
  document.getElementById('absent-count').textContent = absent;
}

// --- Add / Delete Modal ---
const addModal = document.getElementById('add-modal');

function openAddModal() {
  addModal.classList.add('open');
  document.getElementById('new-roll').value = '';
  document.getElementById('new-name').value = '';
}

function closeAddModal() {
  addModal.classList.remove('open');
}

function handleAddStudent(e) {
  e.preventDefault();
  const id = document.getElementById('new-roll').value.trim();
  const name = document.getElementById('new-name').value.trim();

  if (!id || !name) return;

  if (students.some(s => s.id === id)) {
    alert('A student with this Roll No already exists.');
    return;
  }

  students.push({ id, name, status: 'Present' });
  saveData();
  closeAddModal();
  renderTable();
}

function deleteStudent(id) {
  if (confirm('Are you sure you want to remove this student?')) {
    students = students.filter(s => s.id !== id);
    saveData();
    renderTable();
  }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Initialize
loadData();
