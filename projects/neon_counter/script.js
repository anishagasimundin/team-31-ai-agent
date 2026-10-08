let count = 0;
let step = 1;

const counterDisplay = document.getElementById('counterDisplay');
const incBtn = document.getElementById('incBtn');
const decBtn = document.getElementById('decBtn');
const resetBtn = document.getElementById('resetBtn');
const stepBtn = document.getElementById('stepBtn');
const stepValueSpan = document.getElementById('stepValue');

function updateDisplay(isIncreased) {
  counterDisplay.textContent = count;

  // Color dynamics
  counterDisplay.classList.remove('positive', 'negative');
  if (count > 0) {
    counterDisplay.classList.add('positive');
  } else if (count < 0) {
    counterDisplay.classList.add('negative');
  }

  // Pulse animation effect
  counterDisplay.classList.add('pulse');
  setTimeout(() => {
    counterDisplay.classList.remove('pulse');
  }, 150);
}

function increment() {
  count += step;
  updateDisplay(true);
}

function decrement() {
  count -= step;
  updateDisplay(false);
}

function resetCounter() {
  count = 0;
  updateDisplay(null);
}

function cycleStep() {
  if (step === 1) step = 5;
  else if (step === 5) step = 10;
  else if (step === 10) step = 50;
  else if (step === 50) step = 100;
  else step = 1;

  stepValueSpan.textContent = step;
}

// Event Listeners
incBtn.addEventListener('click', increment);
decBtn.addEventListener('click', decrement);
resetBtn.addEventListener('click', resetCounter);
stepBtn.addEventListener('click', cycleStep);

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === '+=') {
    increment();
  } else if (e.key === 'ArrowDown' || e.key === '-') {
    decrement();
  } else if (e.key.toLowerCase() === 'r') {
    resetCounter();
  }
});
