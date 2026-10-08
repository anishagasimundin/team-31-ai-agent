// --- Tab switching ---
function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  hideAlert();

  if (tab === 'login') {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

// --- Password visibility toggle ---
function togglePassword(fieldId, btn) {
  const input = document.getElementById(fieldId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye';
  }
}

// --- Alerts ---
function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('alert-box');
  const alertText = document.getElementById('alert-text');
  alertBox.className = `alert-msg ${type}`;
  alertText.textContent = message;
}

function hideAlert() {
  const alertBox = document.getElementById('alert-box');
  alertBox.className = 'alert-msg';
}

// --- Authentication simulation ---
const DEMO_STUDENT = {
  name: 'Alex Johnson',
  email: 'student@univ.edu',
  password: 'student123'
};

function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const emailInput = document.getElementById('login-email').value.trim();
  const passwordInput = document.getElementById('login-password').value;

  // Retrieve any registered users from localStorage as well
  const customUsers = JSON.parse(localStorage.getItem('student_portal_users') || '[]');
  const foundUser = customUsers.find(u => u.email.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput);

  if ((emailInput.toLowerCase() === DEMO_STUDENT.email && passwordInput === DEMO_STUDENT.password) || foundUser) {
    const studentName = foundUser ? foundUser.name : DEMO_STUDENT.name;
    const studentEmail = foundUser ? foundUser.email : DEMO_STUDENT.email;
    
    showAlert('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      showDashboard(studentName, studentEmail);
    }, 700);
  } else {
    showAlert('Invalid email or password. Try demo credentials below.');
  }
}

function handleRegister(e) {
  e.preventDefault();
  hideAlert();

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters long.');
    return;
  }

  let users = JSON.parse(localStorage.getItem('student_portal_users') || '[]');
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    showAlert('An account with this email already exists.');
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem('student_portal_users', JSON.stringify(users));

  showAlert('Account created successfully! Please sign in.', 'success');
  setTimeout(() => {
    switchTab('login');
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = '';
  }, 1000);
}

// --- Dashboard view toggles ---
function showDashboard(name, email) {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('dashboard-container').style.display = 'block';

  document.getElementById('dash-name').textContent = name;
  document.getElementById('dash-email').textContent = email;
  
  // Generate initials for avatar
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('dash-avatar').textContent = initials;
}

function handleLogout() {
  document.getElementById('dashboard-container').style.display = 'none';
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('login-password').value = '';
  hideAlert();
}

function showForgot(e) {
  e.preventDefault();
  alert('Password reset link sent to your registered student email address!');
}
