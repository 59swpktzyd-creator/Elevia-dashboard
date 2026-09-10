// --- 1. ROUTING & SETUP ---
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const activePage = document.getElementById(`page-${hash}`);
  const activeNav = document.querySelector(`.nav-item[data-page="${hash}"]`);

  if (activePage) activePage.classList.add('active-page');
  if (activeNav) activeNav.classList.add('active');
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  displayQuote();
  loadStreak();
  startLiveClock();
  updateStatsDisplay();
});
  // TARGET THE FOCUS WRAPPER INSTEAD OF THE TIMER CARD
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
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

// --- 3. HABIT LIST & PROGRESS ---
const addBtn = document.getElementById('addBtn');
const habitInput = document.getElementById('habitInput');
const habitList = document.getElementById('habitList');

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

function deleteHabit(btn) {
  btn.closest('.habit-item').remove();
  updateProgress();
}

let hasCelebrated = false;
function updateProgress() {
  const checkboxes = document.querySelectorAll('.habit-check');
  const progressBar = document.getElementById('progressBar');
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
    if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60 });
    hasCelebrated = true;
  } else if (pct < 100) {
    hasCelebrated = false;
  }
}

// --- 4. LIVE FLIP CLOCK ---
function startLiveClock() {
  function update() {
    const now = new Date();
    document.getElementById('flipHours').textContent = String(now.getHours()).padStart(2, '0');
    document.getElementById('flipMinutes').textContent = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('flipSeconds').textContent = String(now.getSeconds()).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

// --- 5. TIMER & AUTOMATIC STATS TRACKING ---
let startTime;
let expectedEndTime;

function startTimer(durationInSeconds) {
  startTime = Date.now();
  expectedEndTime = startTime + (durationInSeconds * 1000);
  
  // Save active timer state so it survives page reloads
  localStorage.setItem('timerActive', 'true');
  localStorage.setItem('expectedEndTime', expectedEndTime);
}

// Recalculate remaining time whenever the user switches back to the tab
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && localStorage.getItem('timerActive') === 'true') {
    const now = Date.now();
    const remaining = Math.max(0, Math.round((expectedEndTime - now) / 1000));
    updateTimerDisplay(remaining);
  }
});



let timer = null, selectedMinutes = 5, remaining = 300, isRunning = false;

function setTimerDuration(mins) {
  if (isRunning) resetTimer();
  selectedMinutes = mins;
  remaining = mins * 60;
  updateClockDisplay();

  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent === `${mins}m`) btn.classList.add('active');
  });
}

function setCustomDuration() {
  const val = parseInt(document.getElementById('customMinutesInput').value, 10);
  if (!val || val < 1 || val > 180) return alert("Enter minutes between 1 and 180.");
  setTimerDuration(val);
  document.getElementById('customMinutesInput').value = '';
}

function toggleTimer() {
  const btn = document.getElementById('startTimerBtn');
  if (!isRunning) {
    isRunning = true;
    btn.textContent = 'Pause';
    timer = setInterval(() => {
      remaining--;
      updateClockDisplay();
      if (remaining <= 0) {
        clearInterval(timer);
        alert('🎉 Focus session completed!');
        recordCompletedFocusTime(selectedMinutes); // AUTO-RECORD STATS
        resetTimer();
      }
    }, 1000);
  } else {
    clearInterval(timer);
    isRunning = false;
    btn.textContent = 'Resume';
  }
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  remaining = selectedMinutes * 60;
  document.getElementById('startTimerBtn').textContent = 'Start Focus';
  updateClockDisplay();
}

function updateClockDisplay() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${m}:${s}`;
}

// --- 6. STATS / ANALYTICS DATA ---
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

  // Goals for progress bars (Daily goal: 60 mins | Weekly goal: 300 mins)
  const dailyGoal = 60;
  const weeklyGoal = 300;

  document.getElementById('todayFocusTime').textContent = today;
  document.getElementById('weeklyFocusTime').textContent = weekly;
  
  // Convert minutes to hours for monthly
  const monthlyHrs = (weekly / 60).toFixed(1);
  document.getElementById('monthlyFocusTime').textContent = monthlyHrs;

  // Progress Bar Calculations
  const todayPct = Math.min(Math.round((today / dailyGoal) * 100), 100);
  const weeklyPct = Math.min(Math.round((weekly / weeklyGoal) * 100), 100);

  document.getElementById('todayProgress').style.width = `${todayPct}%`;
  document.getElementById('weeklyProgress').style.width = `${weeklyPct}%`;
  document.getElementById('monthlyProgress').style.width = `${weeklyPct}%`;
}

function resetStats() {
  if (confirm("Are you sure you want to reset your focus analytics?")) {
    localStorage.removeItem('todayFocus');
    localStorage.removeItem('weeklyFocus');
    updateStatsDisplay();
  }
}

// --- 7. UTILS ---
const quotes = [
  "Small daily improvements build stunning long-term results.",
  "Action creates momentum. Start tiny today.",
  "Consistency transforms average into extraordinary."
];

function displayQuote() {
  const el = document.getElementById('quoteBanner');
  if (el) el.textContent = `${quotes[Math.floor(Math.random() * quotes.length)]}`;
}

function loadStreak() {
  const count = Number(localStorage.getItem('userStreak')) || 0;
  const el = document.getElementById('streakDisplay');
  if (el) el.textContent = `${count} Day Streak`;
}
// --- INTERACTIVE LIQUID GLASS 3D TILT EFFECT ---
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.liquid-glass-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
});