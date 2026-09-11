// --- 1. ROUTING & SETUP ---
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const activePage = document.getElementById(`page-${hash}`);
  const activeNav = document.querySelector(`.nav-item[data-page="${hash}"]`);

  if (activePage) activePage.classList.add('active-page');
  if (activeNav) activeNav.classList.add('active');

  // Re-render Lucide SVG icons on page switch
  if (window.lucide) {
    lucide.createIcons();
  }
}

window.addEventListener('hashchange', handleRouting);

window.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  displayQuote();
  loadStreak();
  startLiveClock();
  updateStatsDisplay();
  checkPersistedTimer();

  // Initial Lucide Icon Load
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Fullscreen Wrapper Toggle
const fsBtn = document.getElementById('fullscreenBtn');
const focusWrapper = document.getElementById('focusWrapper');

if (fsBtn && focusWrapper) {
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      focusWrapper.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// --- 2. DARK MODE ---
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
  });
}

// --- 3. HABIT LIST & PROGRESS ---
const addBtn = document.getElementById('addBtn');
const habitInput = document.getElementById('habitInput');
const habitList = document.getElementById('habitList');

if (addBtn && habitInput) {
  addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = habitInput.value.trim();
    if (!text) return;

    const li = document.createElement('li');
    li.className = 'habit-item';
    li.innerHTML = `
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" class="habit-check" onchange="updateProgress()">
        <span>${text}</span>
      </label>
      <button onclick="deleteHabit(this)" class="delete-ghost">✕</button>
    `;

    habitList.appendChild(li);
    habitInput.value = '';
    updateProgress();
  });
}

function deleteHabit(btn) {
  btn.closest('.habit-item').remove();
  updateProgress();
}

let hasCelebrated = false;
function updateProgress() {
  const checkboxes = document.querySelectorAll('.habit-check');
  const progressBar = document.getElementById('progressBar');
  if (!progressBar) return;

  if (!checkboxes.length) {
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    hasCelebrated = false;
    return;
  }

  let checked = 0;
  checkboxes.forEach(c => { if (c.checked) checked++; });

  const pct = Math.round((checked / checkboxes.length) * 100);
  progressBar.style.width = `${pct}%`;
  progressBar.textContent = `${pct}%`;

  if (pct === 100 && !hasCelebrated) {
    playChimeSound();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    hasCelebrated = true;
  } else if (pct < 100) {
    hasCelebrated = false;
  }
}

// --- 4. LIVE FLIP CLOCK ---
function startLiveClock() {
  function update() {
    const now = new Date();
    const hEl = document.getElementById('flipHours');
    const mEl = document.getElementById('flipMinutes');
    const sEl = document.getElementById('flipSeconds');

    if (hEl) hEl.textContent = String(now.getHours()).padStart(2, '0');
    if (mEl) mEl.textContent = String(now.getMinutes()).padStart(2, '0');
    if (sEl) sEl.textContent = String(now.getSeconds()).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

// --- 5. ACCURATE PERSISTENT TIMER ---
let timer = null;
let selectedMinutes = 25;
let remaining = 1500;
let isRunning = false;
let expectedEndTime = null;

function setTimerDuration(mins) {
  if (isRunning) resetTimer();
  selectedMinutes = mins;
  remaining = mins * 60;
  updateClockDisplay();

  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim() === `${mins}m`) btn.classList.add('active');
  });
}

function setCustomDuration() {
  const input = document.getElementById('customMinutesInput');
  if (!input) return;
  const val = parseInt(input.value, 10);
  if (!val || val < 1 || val > 180) {
    alert("Please enter a focus time between 1 and 180 minutes.");
    return;
  }
  setTimerDuration(val);
  input.value = '';
}

function toggleTimer() {
  const btn = document.getElementById('startTimerBtn');
  if (!btn) return;

  if (!isRunning) {
    // Start Session
    isRunning = true;
    btn.textContent = 'Pause Focus';
    expectedEndTime = Date.now() + (remaining * 1000);
    
    localStorage.setItem('timerActive', 'true');
    localStorage.setItem('expectedEndTime', expectedEndTime);
    localStorage.setItem('selectedMinutes', selectedMinutes);

    timer = setInterval(() => {
      const now = Date.now();
      remaining = Math.max(0, Math.round((expectedEndTime - now) / 1000));
      updateClockDisplay();

      if (remaining <= 0) {
        clearInterval(timer);
        playChimeSound();
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 80 });
        
        recordCompletedFocusTime(selectedMinutes);
        resetTimer();
      }
    }, 1000);
  } else {
    // Pause Session
    clearInterval(timer);
    isRunning = false;
    btn.textContent = 'Resume';
    localStorage.removeItem('timerActive');
  }
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  remaining = selectedMinutes * 60;
  expectedEndTime = null;

  localStorage.removeItem('timerActive');
  localStorage.removeItem('expectedEndTime');

  const btn = document.getElementById('startTimerBtn');
  if (btn) btn.textContent = 'Start Focus';
  updateClockDisplay();
}

function updateClockDisplay() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  const display = document.getElementById('timerDisplay');
  if (display) display.textContent = `${m}:${s}`;
}

function checkPersistedTimer() {
  const isActive = localStorage.getItem('timerActive') === 'true';
  const savedEndTime = Number(localStorage.getItem('expectedEndTime'));
  const savedMins = Number(localStorage.getItem('selectedMinutes')) || 25;

  if (isActive && savedEndTime) {
    const now = Date.now();
    const diff = Math.round((savedEndTime - now) / 1000);

    if (diff > 0) {
      selectedMinutes = savedMins;
      remaining = diff;
      toggleTimer(); // Auto-resume countdown
    } else {
      localStorage.removeItem('timerActive');
      localStorage.removeItem('expectedEndTime');
    }
  }
}

// Background tab visibility sync
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isRunning && expectedEndTime) {
    const now = Date.now();
    remaining = Math.max(0, Math.round((expectedEndTime - now) / 1000));
    updateClockDisplay();
  }
});

// --- 6. STATS & ANALYTICS ---
function recordCompletedFocusTime(minutes) {
  let today = Number(localStorage.getItem('todayFocus')) || 0;
  let weekly = Number(localStorage.getItem('weeklyFocus')) || 0;

  today += minutes;
  weekly += minutes;

  localStorage.setItem('todayFocus', today);
  localStorage.setItem('weeklyFocus', weekly);

  updateStatsDisplay();
}

function updateStatsDisplay() {
  const today = Number(localStorage.getItem('todayFocus')) || 0;
  const weekly = Number(localStorage.getItem('weeklyFocus')) || 0;

  const dailyGoal = 60;
  const weeklyGoal = 300;

  const todayEl = document.getElementById('todayFocusTime');
  const weeklyEl = document.getElementById('weeklyFocusTime');
  const monthlyEl = document.getElementById('monthlyFocusTime');

  if (todayEl) todayEl.textContent = today;
  if (weeklyEl) weeklyEl.textContent = weekly;
  if (monthlyEl) monthlyEl.textContent = (weekly / 60).toFixed(1);

  const todayPct = Math.min(Math.round((today / dailyGoal) * 100), 100);
  const weeklyPct = Math.min(Math.round((weekly / weeklyGoal) * 100), 100);

  const tBar = document.getElementById('todayProgress');
  const wBar = document.getElementById('weeklyProgress');
  const mBar = document.getElementById('monthlyProgress');

  if (tBar) tBar.style.width = `${todayPct}%`;
  if (wBar) wBar.style.width = `${weeklyPct}%`;
  if (mBar) mBar.style.width = `${weeklyPct}%`;
}

function resetStats() {
  if (confirm("Reset focus analytics for today and this week?")) {
    localStorage.removeItem('todayFocus');
    localStorage.removeItem('weeklyFocus');
    updateStatsDisplay();
  }
}

// --- 7. UTILS & MICRO-INTERACTIONS ---
const quotes = [
  "Small daily steps lead to massive long-term transformations.",
  "Action creates momentum. Dive in now.",
  "Deep focus is a superpower. Protect your attention."
];

function displayQuote() {
  const el = document.getElementById('quoteBanner');
  if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function loadStreak() {
  const count = Number(localStorage.getItem('userStreak')) || 0;
  const el = document.getElementById('streakDisplay');
  if (el) el.textContent = `🔥 ${count} Day Streak`;
}

function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5 note

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio Context blocked or unsupported silently handled
  }
}

// Interactive 3D Liquid Glass Card Effect
document.querySelectorAll('.liquid-glass-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });
});