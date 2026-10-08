// Default Mock Data
const defaultStudents = [
    { id: 'STU1001', name: 'Sophia Martinez', email: 'sophia.m@university.edu', course: 'Computer Science 101' },
    { id: 'STU1002', name: 'Liam Anderson', email: 'liam.a@university.edu', course: 'Computer Science 101' },
    { id: 'STU1003', name: 'Olivia Thomas', email: 'olivia.t@university.edu', course: 'Computer Science 101' },
    { id: 'STU1004', name: 'Noah Jackson', email: 'noah.j@university.edu', course: 'Computer Science 101' },
    { id: 'STU1005', name: 'Emma White', email: 'emma.w@university.edu', course: 'Computer Science 101' },
    { id: 'STU1006', name: 'Lucas Harris', email: 'lucas.h@university.edu', course: 'Computer Science 101' },
    { id: 'STU1007', name: 'Ava Martin', email: 'ava.m@university.edu', course: 'Computer Science 101' },
    { id: 'STU1008', name: 'Ethan Clark', email: 'ethan.c@university.edu', course: 'Computer Science 101' },
    { id: 'STU1009', name: 'Mia Lewis', email: 'mia.l@university.edu', course: 'Computer Science 101' },
    { id: 'STU1010', name: 'James Walker', email: 'james.w@university.edu', course: 'Computer Science 101' }
];

// App State
let students = JSON.parse(localStorage.getItem('attendease_students')) || defaultStudents;
let attendanceRecords = JSON.parse(localStorage.getItem('attendease_records')) || {};

// Initialize today's date in input
const todayStr = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = todayStr;
    }
    
    // Ensure today has an entry structure
    if (!attendanceRecords[todayStr]) {
        attendanceRecords[todayStr] = {};
        students.forEach(s => {
            attendanceRecords[todayStr][s.id] = 'Present'; // Default present
        });
        saveData();
    }

    renderDashboard();
    renderAttendanceTable();
    renderStudentsTable();
});

function saveData() {
    localStorage.setItem('attendease_students', JSON.stringify(students));
    localStorage.setItem('attendease_records', JSON.stringify(attendanceRecords));
}

// Navigation & View Switching
function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetSection = document.getElementById(viewId + 'View');
    if (targetSection) targetSection.classList.add('active');
    if (element) element.classList.add('active');

    // Update Header Titles
    const titles = {
        'dashboard': { title: 'Dashboard Overview', subtitle: 'Monitor daily attendance and student metrics.' },
        'attendance': { title: 'Mark Attendance', subtitle: 'Record and update daily student presence.' },
        'students': { title: 'Students Directory', subtitle: 'Manage registered students and profiles.' },
        'reports': { title: 'Reports & Analytics', subtitle: 'Export CSVs and analyze attendance trends.' }
    };

    document.getElementById('headerTitle').innerText = titles[viewId].title;
    document.getElementById('headerSubtitle').innerText = titles[viewId].subtitle;

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'attendance') renderAttendanceTable();
    if (viewId === 'students') renderStudentsTable();
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const btnIcon = document.querySelector('#themeToggleBtn i');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        btnIcon.className = 'fa-solid fa-sun';
    } else {
        html.setAttribute('data-theme', 'dark');
        btnIcon.className = 'fa-solid fa-moon';
    }
}

// Dashboard Calculations & Rendering
function renderDashboard() {
    const currentDate = document.getElementById('attendanceDate').value || todayStr;
    const records = attendanceRecords[currentDate] || {};

    const total = students.length;
    let present = 0;
    let absent = 0;

    students.forEach(s => {
        const status = records[s.id] || 'Present';
        if (status === 'Present' || status === 'Late') present++;
        if (status === 'Absent') absent++;
    });

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    document.getElementById('statTotalStudents').innerText = total;
    document.getElementById('statPresentToday').innerText = present;
    document.getElementById('statAbsentToday').innerText = absent;
    document.getElementById('statRate').innerText = rate + '%';

    // Render Recent Activity
    const tbody = document.getElementById('recentActivityTable');
    tbody.innerHTML = '';

    const recentStudents = students.slice(0, 5);
    recentStudents.forEach(s => {
        const status = records[s.id] || 'Present';
        const badgeClass = getBadgeClass(status);
        const initials = getInitials(s.name);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="student-info">
                    <div class="avatar">${initials}</div>
                    <div>
                        <div style="font-weight: 600;">${s.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.email}</div>
                    </div>
                </div>
            </td>
            <td><code>${s.id}</code></td>
            <td>${s.course}</td>
            <td><span class="badge ${badgeClass}"><i class="${getStatusIcon(status)}"></i> ${status}</span></td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${currentDate} • 09:00 AM</td>
        `;
        tbody.appendChild(tr);
    });
}

// Attendance Table Rendering & Actions
function loadAttendanceForDate() {
    renderDashboard();
    renderAttendanceTable();
}

function renderAttendanceTable() {
    const currentDate = document.getElementById('attendanceDate').value || todayStr;
    if (!attendanceRecords[currentDate]) {
        attendanceRecords[currentDate] = {};
        students.forEach(s => attendanceRecords[currentDate][s.id] = 'Present');
        saveData();
    }

    const records = attendanceRecords[currentDate];
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('attendanceSearch').value.toLowerCase();
    const statusFilter = document.getElementById('attendanceStatusFilter').value;

    const filtered = students.filter(s => {
        const status = records[s.id] || 'Present';
        const matchesSearch = s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>No students found matching your filters.</p></div></td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const status = records[s.id] || 'Present';
        const initials = getInitials(s.name);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="student-info">
                    <div class="avatar">${initials}</div>
                    <span style="font-weight: 600;">${s.name}</span>
                </div>
            </td>
            <td><code>${s.id}</code></td>
            <td>${s.email}</td>
            <td><span class="badge ${getBadgeClass(status)}"><i class="${getStatusIcon(status)}"></i> ${status}</span></td>
            <td>
                <div class="attendance-actions">
                    <button class="btn-status present ${status === 'Present' ? 'active' : ''}" onclick="updateStatus('${s.id}', 'Present')">Present</button>
                    <button class="btn-status absent ${status === 'Absent' ? 'active' : ''}" onclick="updateStatus('${s.id}', 'Absent')">Absent</button>
                    <button class="btn-status late ${status === 'Late' ? 'active' : ''}" onclick="updateStatus('${s.id}', 'Late')">Late</button>
                    <button class="btn-status excused ${status === 'Excused' ? 'active' : ''}" onclick="updateStatus('${s.id}', 'Excused')">Excused</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAttendanceTable() {
    renderAttendanceTable();
}

function updateStatus(studentId, status) {
    const currentDate = document.getElementById('attendanceDate').value || todayStr;
    if (!attendanceRecords[currentDate]) attendanceRecords[currentDate] = {};
    
    attendanceRecords[currentDate][studentId] = status;
    saveData();
    renderAttendanceTable();
    renderDashboard();
    showToast(`Attendance updated for ${studentId} to ${status}`);
}

function markAllPresent() {
    const currentDate = document.getElementById('attendanceDate').value || todayStr;
    if (!attendanceRecords[currentDate]) attendanceRecords[currentDate] = {};

    students.forEach(s => {
        attendanceRecords[currentDate][s.id] = 'Present';
    });
    saveData();
    renderAttendanceTable();
    renderDashboard();
    showToast('All students marked present for today!', 'success');
}

// Students Directory Rendering
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-users-slash"></i><p>No students registered.</p></div></td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const initials = getInitials(s.name);
        
        // Calculate overall attendance percentage for student
        let totalDays = 0;
        let presentDays = 0;
        Object.keys(attendanceRecords).forEach(date => {
            if (attendanceRecords[date][s.id]) {
                totalDays++;
                if (attendanceRecords[date][s.id] === 'Present' || attendanceRecords[date][s.id] === 'Late') {
                    presentDays++;
                }
            }
        });
        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
        const rateColor = rate >= 75 ? 'var(--success)' : 'var(--danger)';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="student-info">
                    <div class="avatar">${initials}</div>
                    <span style="font-weight: 600;">${s.name}</span>
                </div>
            </td>
            <td><code>${s.id}</code></td>
            <td>${s.email}</td>
            <td>${s.course}</td>
            <td><strong style="color: ${rateColor};">${rate}%</strong> (${presentDays}/${totalDays} sessions)</td>
            <td>
                <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteStudent('${s.id}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterStudentsTable() {
    renderStudentsTable();
}

function handleAddNewStudent(event) {
    event.preventDefault();
    const name = document.getElementById('newStudentName').value.trim();
    const id = document.getElementById('newStudentId').value.trim();
    const email = document.getElementById('newStudentEmail').value.trim();
    const course = document.getElementById('newStudentCourse').value.trim();

    if (students.some(s => s.id === id)) {
        alert('A student with this ID already exists!');
        return;
    }

    students.push({ id, name, email, course });
    
    // Add default present for today
    if (!attendanceRecords[todayStr]) attendanceRecords[todayStr] = {};
    attendanceRecords[todayStr][id] = 'Present';

    saveData();
    closeModal('addStudentModal');
    document.getElementById('addStudentForm').reset();
    renderStudentsTable();
    renderDashboard();
    showToast(`Successfully registered ${name}!`, 'success');
}

function deleteStudent(studentId) {
    if (confirm(`Are you sure you want to remove student ${studentId}?`)) {
        students = students.filter(s => s.id !== studentId);
        saveData();
        renderStudentsTable();
        renderDashboard();
        showToast('Student removed successfully.');
    }
}

// Reports & Export Functions
function exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Student ID,Student Name,Course,Status\n";

    Object.keys(attendanceRecords).forEach(date => {
        const records = attendanceRecords[date];
        students.forEach(s => {
            const status = records[s.id] || 'Unrecorded';
            csvContent += `${date},${s.id},"${s.name}","${s.course}",${status}\n`;
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV report downloaded successfully!', 'success');
}

function printReport() {
    window.print();
}

function showLowAttendance() {
    const container = document.getElementById('reportResultContainer');
    let atRisk = [];

    students.forEach(s => {
        let totalDays = 0;
        let presentDays = 0;
        Object.keys(attendanceRecords).forEach(date => {
            if (attendanceRecords[date][s.id]) {
                totalDays++;
                if (attendanceRecords[date][s.id] === 'Present' || attendanceRecords[date][s.id] === 'Late') {
                    presentDays++;
                }
            }
        });
        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
        if (rate < 75 && totalDays > 0) {
            atRisk.push({ ...s, rate });
        }
    });

    if (atRisk.length === 0) {
        container.innerHTML = `
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
                <i class="fa-solid fa-circle-check" style="font-size: 32px; color: var(--success); margin-bottom: 8px;"></i>
                <h4>Great news! No students are at risk.</h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">All students maintain an attendance rate above 75%.</p>
            </div>
        `;
        return;
    }

    let html = `
        <h4 style="margin-bottom: 16px; color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> At-Risk Students (&lt; 75% Attendance)</h4>
        <div class="table-responsive card">
            <table>
                <thead>
                    <tr><th>Student</th><th>ID</th><th>Email</th><th>Attendance Rate</th></tr>
                </thead>
                <tbody>
    `;

    atRisk.forEach(s => {
        html += `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td><code>${s.id}</code></td>
                <td>${s.email}</td>
                <td><span class="badge badge-absent">${s.rate}%</span></td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
    showToast('Generated at-risk student report.');
}

// Modal Helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Utilities
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function getBadgeClass(status) {
    switch (status) {
        case 'Present': return 'badge-present';
        case 'Absent': return 'badge-absent';
        case 'Late': return 'badge-late';
        case 'Excused': return 'badge-excused';
        default: return 'badge-excused';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'Present': return 'fa-solid fa-check';
        case 'Absent': return 'fa-solid fa-xmark';
        case 'Late': return 'fa-solid fa-clock';
        case 'Excused': return 'fa-solid fa-hand';
        default: return 'fa-solid fa-check';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-info';
    let color = 'var(--accent)';
    if (type === 'success') {
        icon = 'fa-circle-check';
        color = 'var(--success)';
    }

    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function resetDemoData() {
    if (confirm('Reset all students and attendance records to default?')) {
        localStorage.clear();
        location.reload();
    }
}
