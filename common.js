/* ═══════════════════════════════════════════════════════════════════
   COMMON MODULE — Shared state, storage, date, and dark-mode logic
   ───────────────────────────────────────────────────────────────────
   Everything in this file is needed by BOTH the Home page (index.html)
   and the Reports page (reports.html), so it lives here once instead
   of being duplicated in script.js and reports.js.
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "studentPlannerData";
const DAILY_RESET_TIME = "lastResetDate";

const DEFAULT_SUBJECTS = [
  { id: "sub-1", name: "Bangla 1st", short: "BNG 1ST" },
  { id: "sub-2", name: "Bangla 2nd", short: "BNG 2ND" },
  { id: "sub-3", name: "English 1st", short: "ENG 1ST" },
  { id: "sub-4", name: "English 2nd", short: "ENG 2ND" },
  { id: "sub-5", name: "Math 1st", short: "MATH 1ST" },
  { id: "sub-6", name: "Math 2nd", short: "MATH 2ND" },
  { id: "sub-7", name: "Physics 1st", short: "PHY 1ST" },
  { id: "sub-8", name: "Physics 2nd", short: "PHY 2ND" },
  { id: "sub-9", name: "Chemistry 1st", short: "CHEM 1ST" },
  { id: "sub-10", name: "Chemistry 2nd", short: "CHEM 2ND" },
  { id: "sub-11", name: "Botany", short: "BOTANY" },
  { id: "sub-12", name: "Zoology", short: "ZOOLOGY" },
  { id: "sub-13", name: "ICT", short: "ICT" },
];

function deriveShortForm(name) {
  const words = String(name).trim().split(/\s+/);
  return words
    .map((word) => {
      if (/^\d+(st|nd|rd|th)$/i.test(word)) return word.toUpperCase();
      return word.length <= 3
        ? word.toUpperCase()
        : word.slice(0, 3).toUpperCase();
    })
    .join(" ");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

let state = {
  todos: [],
  homework: [],
  revision: [],
  goals: [],
  routine: null,
  subjects: [],
  subjectsInitialized: false,
  analytics: { sessions: 0, hoursToday: 0, tasksCompleted: 0 },
  timerData: { totalMinutesStudied: 0 },
  history: [],
};

let _onReportDataChanged = null;
function onReportDataChanged(fn) {
  _onReportDataChanged = fn;
}
function notifyReportDataChanged() {
  if (_onReportDataChanged) _onReportDataChanged();
}

const ROUTINE_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const ROUTINE_HEADERS = ["Subject", "Subject", "Subject", "Subject"];
const ROUTINE_DEFAULT_SUBJECTS = [
  "Bangla",
  "English",
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "ICT",
];
const ROUTINE_NOTE_MIN_HEIGHT = 40;
const ROUTINE_NOTE_MAX_HEIGHT = 220;

function createDefaultRoutine() {
  return {
    dayHeader: "Day",
    headers: [...ROUTINE_HEADERS],
    days: ROUTINE_DAYS.map((day, dayIndex) => ({
      name: day,
      slots: ROUTINE_HEADERS.map((_, slotIndex) => {
        const subject =
          ROUTINE_DEFAULT_SUBJECTS[
            (dayIndex + slotIndex) % ROUTINE_DEFAULT_SUBJECTS.length
          ];
        const startHour = 16 + slotIndex;
        return {
          time: `${pad(startHour)}:00 - ${pad(startHour + 1)}:00`,
          subject,
          note: "",
          noteHeight: ROUTINE_NOTE_MIN_HEIGHT,
        };
      }),
    })),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notifyReportDataChanged();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
    state.todos = state.todos || [];
    state.homework = state.homework || [];
    state.revision = (state.revision || []).map((r) => ({
      ...r,
      done: Boolean(r.done),
    }));
    state.goals = state.goals || [];
    state.history = state.history || [];
    state.routine = normalizeRoutine(state.routine);
    state.analytics = {
      sessions: 0,
      hoursToday: 0,
      tasksCompleted: 0,
      ...state.analytics,
    };
    state.timerData = { totalMinutesStudied: 0, ...state.timerData };

    if (!state.subjectsInitialized) {
      state.subjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
      state.subjectsInitialized = true;
    } else {
      state.subjects = state.subjects || [];
    }
    state.subjects = state.subjects.map((s) => {
      const defaultMatch = DEFAULT_SUBJECTS.find(
        (d) => d.id === s.id && d.name.toLowerCase() === s.name.toLowerCase(),
      );
      return {
        ...s,
        short: defaultMatch ? defaultMatch.short : deriveShortForm(s.name),
      };
    });

    const fixSubjectValue = (value) => {
      if (state.subjects.some((s) => s.short === value)) return value;
      const match = state.subjects.find(
        (s) => deriveShortForm(s.name) === value,
      );
      return match ? match.short : value;
    };
    state.homework.forEach((item) => {
      item.subject = fixSubjectValue(item.subject);
    });
    state.revision.forEach((item) => {
      item.subject = fixSubjectValue(item.subject);
    });
  } else {
    state.routine = createDefaultRoutine();
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
    state.subjectsInitialized = true;
  }
}

function normalizeRoutine(routine) {
  const fallback = createDefaultRoutine();
  if (!routine || !Array.isArray(routine.days)) return fallback;

  const headers = Array.isArray(routine.headers)
    ? ROUTINE_HEADERS.map((header, index) => routine.headers[index] || header)
    : fallback.headers;

  const days = ROUTINE_DAYS.map((dayName, dayIndex) => {
    const savedDay = routine.days[dayIndex] || {};
    const fallbackDay = fallback.days[dayIndex];
    const savedSlots = Array.isArray(savedDay.slots) ? savedDay.slots : [];

    return {
      name: savedDay.name || fallbackDay.name || dayName,
      slots: ROUTINE_HEADERS.map((_, slotIndex) => ({
        ...fallbackDay.slots[slotIndex],
        ...(savedSlots[slotIndex] || {}),
        noteHeight: clamp(
          Number.parseInt(savedSlots[slotIndex]?.noteHeight, 10) ||
            ROUTINE_NOTE_MIN_HEIGHT,
          ROUTINE_NOTE_MIN_HEIGHT,
          ROUTINE_NOTE_MAX_HEIGHT,
        ),
      })),
    };
  });
  return { dayHeader: routine.dayHeader || fallback.dayHeader, headers, days };
}

function getTodayISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function buildDailySnapshot(date) {
  const hwCompleted = state.homework.filter((h) => h.done).length;
  const revCompleted = state.revision.filter((r) => r.done).length;
  const goalsCompleted = state.goals.filter((g) => g.done).length;

  return {
    date,
    homework: { completed: hwCompleted, total: state.homework.length },
    revision: { completed: revCompleted, total: state.revision.length },
    goals: { completed: goalsCompleted, total: state.goals.length },
    studyHours: state.analytics.hoursToday || 0,
    sessions: state.analytics.sessions || 0,
  };
}

function updateTodaySnapshot() {
  const today = getTodayISO();
  const existing = state.history.find((h) => h.date === today);
  const snap = buildDailySnapshot(today);

  if (existing) {
    Object.assign(existing, snap);
  } else {
    state.history.push(snap);
  }
}

function snapshotDay() {
  const today = getTodayISO();
  const existing = state.history.find((h) => h.date === today);
  const snap = buildDailySnapshot(today);

  if (existing) {
    Object.assign(existing, snap);
  } else {
    state.history.push(snap);
  }

  if (state.history.length > 90) state.history = state.history.slice(-90);
}

function checkDailyReset() {
  const today = new Date().toDateString();
  const lastReset = localStorage.getItem(DAILY_RESET_TIME);
  if (lastReset !== today) {
    resetDailyData();
    localStorage.setItem(DAILY_RESET_TIME, today);
  }
}

function resetDailyData() {
  snapshotDay();
  state.todos = state.todos.map((t) => ({ ...t, done: false }));
  state.homework = state.homework.map((h) => ({ ...h, done: false }));
  state.goals = [];
  state.analytics = { sessions: 0, hoursToday: 0, tasksCompleted: 0 };
  saveState();
  // updateAllUI only exists on the Home page — guard so Reports page
  // (and any other future page) can safely trigger a daily reset too.
  if (typeof updateAllUI === "function") updateAllUI();
}

function getWeekRange(offset = 0) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceSat = (today.getDay() + 1) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceSat + offset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { start: weekStart, end: weekEnd };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function dateToISO(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function getEntriesInRange(startDate, endDate) {
  const startISO = dateToISO(startDate);
  const endISO = dateToISO(endDate);
  return state.history.filter((h) => h.date >= startISO && h.date <= endISO);
}

function aggregateEntries(entries) {
  let studyHours = 0,
    sessions = 0,
    hwCompleted = 0,
    hwAssigned = 0;
  let revCompleted = 0,
    revScheduled = 0,
    goalsCompleted = 0,
    goalsCreated = 0;

  entries.forEach((e) => {
    studyHours += e.studyHours || 0;
    sessions += e.sessions || 0;
    hwCompleted += e.homework?.completed || 0;
    hwAssigned += e.homework?.total || 0;
    revCompleted += e.revision?.completed || 0;
    revScheduled += e.revision?.total || 0;
    goalsCompleted += e.goals?.completed || 0;
    goalsCreated += e.goals?.total || 0;
  });

  return {
    studyHours,
    sessions,
    homework: {
      completed: hwCompleted,
      assigned: hwAssigned,
      missed: Math.max(0, hwAssigned - hwCompleted),
    },
    revision: {
      completed: revCompleted,
      scheduled: revScheduled,
      missed: Math.max(0, revScheduled - revCompleted),
    },
    goals: {
      completed: goalsCompleted,
      created: goalsCreated,
      missed: Math.max(0, goalsCreated - goalsCompleted),
    },
    dailyBreakdown: entries,
  };
}

function getWeeklyData(offset = 0) {
  updateTodaySnapshot();
  const range = getWeekRange(offset);
  const entries = getEntriesInRange(range.start, range.end);
  const data = aggregateEntries(entries);
  data.numDays = Math.min(7, entries.length || 1);
  data.avgStudyPerDay = data.numDays > 0 ? data.studyHours / data.numDays : 0;
  data.range = range;
  return data;
}

function getMonthlyData() {
  updateTodaySnapshot();
  const range = getMonthRange();
  const entries = getEntriesInRange(range.start, range.end);
  const data = aggregateEntries(entries);
  data.numDays = Math.min(31, entries.length || 1);
  data.avgStudyPerDay = data.numDays > 0 ? data.studyHours / data.numDays : 0;
  data.range = range;
  return data;
}

function updateDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}

// ----------------------------- Dark Mode
const DARK_MODE_KEY = "darkModeEnabled";
function initDarkMode() {
  const icon = document.getElementById("toggle-icon");
  if (localStorage.getItem(DARK_MODE_KEY) === "true") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (icon) icon.textContent = "☀️";
  }
}
function toggleDarkMode() {
  const html = document.documentElement;
  const icon = document.getElementById("toggle-icon");
  if (html.getAttribute("data-theme") === "dark") {
    html.removeAttribute("data-theme");
    if (icon) icon.textContent = "🌙";
    localStorage.setItem(DARK_MODE_KEY, "false");
  } else {
    html.setAttribute("data-theme", "dark");
    if (icon) icon.textContent = "☀️";
    localStorage.setItem(DARK_MODE_KEY, "true");
  }
}

// ----------------------------- Optimized Custom Cursor (RAF & Global Delegation)
function initCustomCursor() {
  const cursor = document.getElementById("custom-cursor"),
    trail = document.getElementById("cursor-trail");
  if (!cursor || !trail) return;

  let mouseX = window.innerWidth / 2,
    mouseY = window.innerHeight / 2,
    trailX = mouseX,
    trailY = mouseY;
  let isMoving = false;

  document.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        isMoving = true;
        requestAnimationFrame(updateCursor);
      }
    },
    { passive: true },
  );

  function updateCursor() {
    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    isMoving = false;
  }

  function animateTrail() {
    trailX += (mouseX - trailX) * 0.2;
    trailY += (mouseY - trailY) * 0.2;
    trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0)`;
    requestAnimationFrame(animateTrail);
  }
  animateTrail();

  // Event Delegation for hover states (Replaces massive NodeList iterating and memory leaks)
  const interactiveSelector =
    "button, a, input, textarea, select, .card, .todo-item, .hw-row, .clock-tab, .routine-panel, .todo-check, .hw-check, .delete-btn";
  document.body.addEventListener("mouseover", (e) => {
    if (e.target.closest(interactiveSelector))
      document.body.classList.add("cursor-hover");
  });
  document.body.addEventListener("mouseout", (e) => {
    if (e.target.closest(interactiveSelector))
      document.body.classList.remove("cursor-hover");
  });

  window.addHoverListeners = () => {}; // Stub out old calls from original HTML to avoid breaking changes
}

// ----------------------------- Intersection Observer
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-revealed");
      });
    },
    { threshold: 0.1 },
  );
  document
    .querySelectorAll(".reveal-on-scroll")
    .forEach((el) => observer.observe(el));
}

// ----------------------------- Init (shared by every page)
window.addEventListener("load", () => {
  loadState();
  checkDailyReset();
  updateDate();
  setInterval(updateDate, 60000);
  initDarkMode();
  initCustomCursor();
  initScrollReveal();
});
