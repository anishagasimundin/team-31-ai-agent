// App State
let simulationSpeed = 1;
let isAiMode = true;
let activeVehiclesCount = 0;

// Signal states: 'NS_GREEN', 'NS_YELLOW', 'EW_GREEN', 'EW_YELLOW'
let currentSignalState = 'EW_GREEN';
let signalTimer = 18;

// Vehicles array for canvas simulation
let vehicles = [];

// Intersections list
const intersections = [
    { id: 401, name: 'Broadway & 5th Ave', status: 'Optimal', vehicles: 42, avgWait: '18s', light: 'GREEN' },
    { id: 402, name: 'Downtown Center #402', status: 'Heavy Flow', vehicles: 89, avgWait: '32s', light: 'GREEN' },
    { id: 403, name: 'Financial District North', status: 'Optimal', vehicles: 29, avgWait: '14s', light: 'RED' },
    { id: 404, name: 'University Blvd Gate 3', status: 'Moderate', vehicles: 54, avgWait: '22s', light: 'GREEN' },
    { id: 405, name: 'Harbor Expressway Junction', status: 'Optimal', vehicles: 38, avgWait: '16s', light: 'RED' }
];

// Incidents list
let incidents = [
    { id: 'INC-901', location: 'Broadway & 5th Ave', type: 'Stalled Vehicle', severity: 'Moderate', status: 'Dispatched Tow', action: 'Green Wave rerouted' },
    { id: 'INC-902', location: 'Downtown Center #402', type: 'Emergency Ambulance', severity: 'Critical', status: 'Signal Preemption Active', action: 'Corridor cleared' }
];

// Canvas Setup
const canvas = document.getElementById('trafficCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

document.addEventListener('DOMContentLoaded', () => {
    initCanvasSize();
    window.addEventListener('resize', initCanvasSize);
    
    // Spawn initial cars
    for (let i = 0; i < 16; i++) {
        spawnVehicle();
    }

    renderIntersections();
    renderIncidents();
    startSimulationLoop();
});

function initCanvasSize() {
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth - 48;
    canvas.height = 420;
}

// Vehicle Class
class Vehicle {
    constructor(direction, isEmergency = false) {
        this.direction = direction; // 'N', 'S', 'E', 'W'
        this.isEmergency = isEmergency;
        this.speed = isEmergency ? 3.5 : (Math.random() * 1.5 + 1.5);
        this.color = isEmergency ? '#ef4444' : getRandomColor();
        this.length = isEmergency ? 36 : 28;
        this.width = 16;
        this.stopped = false;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (direction === 'N') {
            this.x = cx - 22;
            this.y = canvas.height + 40;
            this.targetY = cy + 50;
        } else if (direction === 'S') {
            this.x = cx + 6;
            this.y = -40;
            this.targetY = cy - 50;
        } else if (direction === 'W') {
            this.x = canvas.width + 40;
            this.y = cy + 6;
            this.targetX = cx + 50;
        } else if (direction === 'E') {
            this.x = -40;
            this.y = cy - 22;
            this.targetX = cx - 50;
        }
    }

    update() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Check traffic lights
        let canGo = true;
        const isNS = this.direction === 'N' || this.direction === 'S';
        const isGreen = isNS ? (currentSignalState.includes('NS')) : (currentSignalState.includes('EW'));

        if (!isGreen || this.isEmergency) {
            // Check stop lines
            if (this.direction === 'N' && this.y > cy + 40 && this.y < cy + 80 && !isGreen) canGo = false;
            if (this.direction === 'S' && this.y < cy - 40 && this.y > cy - 80 && !isGreen) canGo = false;
            if (this.direction === 'W' && this.x > cx + 40 && this.x < cx + 80 && !isGreen) canGo = false;
            if (this.direction === 'E' && this.x < cx - 40 && this.x > cx - 80 && !isGreen) canGo = false;
        }

        if (this.isEmergency) canGo = true; // Emergency preempts lights

        // Check car ahead distance
        for (let other of vehicles) {
            if (other !== this && other.direction === this.direction) {
                if (this.direction === 'N' && other.y < this.y && other.y > this.y - 45) canGo = false;
                if (this.direction === 'S' && other.y > this.y && other.y < this.y + 45) canGo = false;
                if (this.direction === 'W' && other.x < this.x && other.x > this.x - 45) canGo = false;
                if (this.direction === 'E' && other.x > this.x && other.x < this.x + 45) canGo = false;
            }
        }

        this.stopped = !canGo;

        if (canGo) {
            if (this.direction === 'N') this.y -= this.speed * simulationSpeed;
            if (this.direction === 'S') this.y += this.speed * simulationSpeed;
            if (this.direction === 'W') this.x -= this.speed * simulationSpeed;
            if (this.direction === 'E') this.x += this.speed * simulationSpeed;
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.isEmergency ? '#ef4444' : 'transparent';
        ctx.shadowBlur = this.isEmergency ? 12 : 0;

        ctx.beginPath();
        if (this.direction === 'N' || this.direction === 'S') {
            ctx.roundRect(this.x, this.y, this.width, this.length, 6);
        } else {
            ctx.roundRect(this.x, this.y, this.length, this.width, 6);
        }
        ctx.fill();

        // Headlights / Emergency Flasher
        ctx.fillStyle = '#fde047';
        if (this.isEmergency && Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
        }
        ctx.fillRect(this.x + 2, this.y + 2, 4, 4);
        ctx.fillRect(this.x + this.width - 6, this.y + 2, 4, 4);

        ctx.restore();
    }
}

function getRandomColor() {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function spawnVehicle(isEmergency = false) {
    const directions = ['N', 'S', 'E', 'W'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    vehicles.push(new Vehicle(dir, isEmergency));
}

// Simulation Main Loop
let lastTimerTick = Date.now();

function startSimulationLoop() {
    setInterval(() => {
        // Update timer
        const now = Date.now();
        if (now - lastTimerTick >= 1000) {
            lastTimerTick = now;
            signalTimer -= simulationSpeed;

            if (signalTimer <= 0) {
                switchSignals();
            }
            updateDOMStats();
        }

        // Update & Render Canvas
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawIntersectionBackground();

            // Manage vehicle count
            if (vehicles.length < 25 && Math.random() < 0.3) {
                spawnVehicle();
            }

            // Update vehicles
            for (let i = vehicles.length - 1; i >= 0; i--) {
                vehicles[i].update();
                vehicles[i].draw();

                // Remove out of bounds
                if (vehicles[i].x < -60 || vehicles[i].x > canvas.width + 60 || vehicles[i].y < -60 || vehicles[i].y > canvas.height + 60) {
                    vehicles.splice(i, 1);
                }
            }
        }
    }, 1000 / 60);
}

function drawIntersectionBackground() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Roads
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 70, 0, 140, canvas.height); // NS Road
    ctx.fillRect(0, cy - 70, canvas.width, 140); // EW Road

    // Center Intersection Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 70, cy - 70, 140, 140);

    // Road Markings (Dashed lines)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);

    // NS Center line
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - 70);
    ctx.moveTo(cx, cy + 70);
    ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    // EW Center line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(cx - 70, cy);
    ctx.moveTo(cx + 70, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stop Lines & Traffic Lights
    drawTrafficLightPoles(cx, cy);
}

function drawTrafficLightPoles(cx, cy) {
    const isNSGreen = currentSignalState.includes('NS');
    const isEWGreen = currentSignalState.includes('EW');

    // North Light
    drawSingleLight(cx - 85, cy - 85, isNSGreen ? 'green' : 'red');
    // South Light
    drawSingleLight(cx + 65, cy + 65, isNSGreen ? 'green' : 'red');
    // East Light
    drawSingleLight(cx + 65, cy - 85, isEWGreen ? 'green' : 'red');
    // West Light
    drawSingleLight(cx - 85, cy + 65, isEWGreen ? 'green' : 'red');
}

function drawSingleLight(x, y, color) {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 20, 46, 6);
    ctx.fill();
    ctx.stroke();

    // Red Bulb
    ctx.fillStyle = color === 'red' ? '#ef4444' : '#451a03';
    ctx.beginPath();
    ctx.arc(x + 10, y + 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Green Bulb
    ctx.fillStyle = color === 'green' ? '#10b981' : '#022c22';
    ctx.beginPath();
    ctx.arc(x + 10, y + 34, 6, 0, Math.PI * 2);
    ctx.fill();
}

function switchSignals() {
    if (currentSignalState === 'EW_GREEN') {
        currentSignalState = 'NS_GREEN';
        signalTimer = 20;
        addAiLog('AI Adaptive: High North-South queue detected. Switched NS to GREEN.');
    } else {
        currentSignalState = 'EW_GREEN';
        signalTimer = 18;
        addAiLog('AI Adaptive: East-West flow optimized. Switched EW to GREEN.');
    }
}

function updateDOMStats() {
    activeVehiclesCount = vehicles.length + 48;
    document.getElementById('statVehicles').innerText = activeVehiclesCount;

    const isNS = currentSignalState.includes('NS');
    const nsBadge = document.getElementById('nsLightBadge');
    const ewBadge = document.getElementById('ewLightBadge');
    const nsTimer = document.getElementById('nsTimer');
    const ewTimer = document.getElementById('ewTimer');

    if (nsBadge && ewBadge) {
        nsBadge.innerText = isNS ? 'GREEN' : 'RED';
        nsBadge.className = `light-badge ${isNS ? 'green' : 'red'}`;
        ewBadge.innerText = !isNS ? 'GREEN' : 'RED';
        ewBadge.className = `light-badge {!isNS ? 'green' : 'red'}`;
    }

    if (nsTimer && ewTimer) {
        nsTimer.innerText = `Time remaining: ${Math.max(0, signalTimer)}s`;
        ewTimer.innerText = `Time remaining: ${Math.max(0, signalTimer)}s`;
    }
}

function forceSignal(direction) {
    if (direction === 'ns') {
        currentSignalState = 'NS_GREEN';
        signalTimer = 25;
        showToast('Forced North-South GREEN signal.', 'success');
        addAiLog('Manual Override: North-South signal forced green.');
    } else {
        currentSignalState = 'EW_GREEN';
        signalTimer = 25;
        showToast('Forced East-West GREEN signal.', 'success');
        addAiLog('Manual Override: East-West signal forced green.');
    }
}

function triggerEmergencyVehicle() {
    spawnVehicle(true);
    showToast('Emergency vehicle dispatched! Signal corridor preemption active.', 'success');
    addAiLog('EMERGENCY PREEMPTION: Priority corridor opened for ambulance.');
    
    // Add incident
    incidents.unshift({
        id: 'INC-' + Math.floor(Math.random() * 900 + 100),
        location: 'Downtown Center #402',
        type: 'Emergency Vehicle Corridor',
        severity: 'Critical',
        status: 'Active Preemption',
        action: 'Green wave triggered'
    });
    renderIncidents();
}

function setSpeed(speed) {
    simulationSpeed = speed;
    document.getElementById('simulationSpeedBadge').innerText = speed + 'x Speed';
    showToast(`Simulation speed set to ${speed}x`);
}

function toggleMode() {
    isAiMode = !isAiMode;
    const btn = document.getElementById('modeToggleBtn');
    if (isAiMode) {
        btn.innerHTML = '<i class="fa-solid fa-robot"></i> Mode: AI Adaptive';
        showToast('Switched to AI Adaptive Control Mode', 'success');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-clock"></i> Mode: Fixed Timers';
        showToast('Switched to Fixed Timer Mode');
    }
}

function addAiLog(message) {
    const container = document.getElementById('aiLogContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.style.color = 'var(--text-secondary)';
    div.innerHTML = `<i class="fa-solid fa-microchip" style="color: var(--accent);"></i> ${message}`;
    container.prepend(div);
    if (container.children.length > 8) container.lastChild.remove();
}

// Navigation View Switching
function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetSection = document.getElementById(viewId + 'View');
    if (targetSection) targetSection.classList.add('active');
    if (element) element.classList.add('active');

    const titles = {
        'dashboard': { title: 'Intersection Live Simulation', subtitle: 'AI-powered adaptive traffic signal coordination in real time.' },
        'intersections': { title: 'Mesh Intersections', subtitle: 'Monitor and configure interconnected city junctions.' },
        'analytics': { title: 'Traffic Analytics & Flow', subtitle: 'Compare legacy timing vs. AI neural green wave efficiency.' },
        'incidents': { title: 'Incident & Emergency Log', subtitle: 'Track road accidents, stalled vehicles, and priority corridors.' }
    };

    document.getElementById('headerTitle').innerText = titles[viewId].title;
    document.getElementById('headerSubtitle').innerText = titles[viewId].subtitle;
}

// Render Intersections Grid
function renderIntersections() {
    const grid = document.getElementById('intersectionGrid');
    if (!grid) return;
    grid.innerHTML = '';

    intersections.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '0';
        div.innerHTML = `
            <div class="card-header">
                <h3>#${item.id} - ${item.name}</h3>
                <span class="badge ${item.light === 'GREEN' ? 'badge-green' : 'badge-red'}">${item.light}</span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 16px;">Status: <strong>${item.status}</strong></p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Active Vehicles: <strong>${item.vehicles}</strong></span>
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Avg Wait: <strong>${item.avgWait}</strong></span>
            </div>
            <button class="btn btn-secondary" style="width: 100%; font-size: 0.85rem;" onclick="showToast('Connected to telemetry feed for Intersection #${item.id}', 'success')">Inspect Telemetry</button>
        `;
        grid.appendChild(div);
    });
}

// Render Incidents Table
function renderIncidents() {
    const tbody = document.getElementById('incidentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    incidents.forEach(inc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${inc.id}</code></td>
            <td><strong>${inc.location}</strong></td>
            <td>${inc.type}</td>
            <td><span class="badge ${inc.severity === 'Critical' ? 'badge-red' : 'badge-yellow'}">${inc.severity}</span></td>
            <td>${inc.status}</td>
            <td style="color: var(--green); font-weight: 600;">${inc.action}</td>
        `;
        tbody.appendChild(tr);
    });
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

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-info';
    let color = 'var(--accent)';
    if (type === 'success') {
        icon = 'fa-circle-check';
        color = 'var(--green)';
    }

    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function resetSystem() {
    if (confirm('Reset traffic simulation mesh?')) {
        location.reload();
    }
}
