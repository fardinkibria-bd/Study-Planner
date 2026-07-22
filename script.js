/* NOTE: STORAGE_KEY, DEFAULT_SUBJECTS, deriveShortForm, pad, clamp,
   state, onReportDataChanged, the ROUTINE_* constants,
   createDefaultRoutine, saveState, loadState, normalizeRoutine,
   checkDailyReset, resetDailyData, and the report data-aggregation
   helpers all now live in common.js, since the Reports page needs them
   too. common.js loads before this file, so everything below can still
   reference them directly. */

function setupMidnightRefresh() {
  function getMsToMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  function scheduleReset() {
    setTimeout(() => {
      resetDailyData();
      localStorage.setItem(DAILY_RESET_TIME, new Date().toDateString());
      updateLastRefreshed();
      scheduleReset();
    }, getMsToMidnight());
  }
  scheduleReset();
  updateLastRefreshed();
}

function updateLastRefreshed() {
  const el = document.getElementById("last-refreshed");
  if (el)
    el.textContent =
      "Refreshed " +
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function subjectClass(subject) {
  const normalized = String(subject).toLowerCase();
  if (normalized.includes("math")) return "subj-math";
  if (normalized.includes("phy")) return "subj-phy";
  if (normalized.includes("eng")) return "subj-eng";
  if (normalized.includes("bot") || normalized.includes("zoo"))
    return "subj-bio";
  if (normalized.includes("chem")) return "subj-chem";
  if (normalized.includes("ict")) return "subj-ict";
  if (normalized.includes("bng")) return "subj-bng";
  return "subj-general";
}

// ----------------------------- Todos, HW, Revision & Goals
function addTask() {
  const input = document.getElementById("task-input");
  const priority = document.getElementById("priority-select").value;
  const val = input.value.trim();
  if (!val) return;
  state.todos.push({ id: Date.now(), text: val, done: false, priority });
  saveState();
  updateTodoUI();
  input.value = "";
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    if (todo.done) state.analytics.tasksCompleted++;
    saveState();
    updateTodoUI();
    updateAnalyticsUI();
  }
}

function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  saveState();
  updateTodoUI();
}

function updateTodoUI() {
  const list = document.getElementById("todo-list");
  const done = state.todos.filter((t) => t.done).length;
  const total = state.todos.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("todo-count").textContent = `${done}/${total} done`;
  document.getElementById("todo-pct").textContent = `${pct}%`;
  document.getElementById("todo-fill").style.width = `${pct}%`;

  list.innerHTML = state.todos
    .map(
      (t) => `
    <div class="todo-item">
      <div class="todo-check ${t.done ? "done" : ""}" onclick="toggleTodo(${t.id})">
        ${t.done ? "✓" : ""}
      </div>
      <span class="todo-text ${t.done ? "done" : ""}">${escapeHTML(t.text)}</span>
      <span class="priority p-${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
      <button class="delete-btn" onclick="deleteTodo(${t.id})">✕</button>
    </div>`,
    )
    .join("");
}

function addHomework() {
  const input = document.getElementById("hw-input");
  const subject = document.getElementById("hw-subject").value;
  const val = input.value.trim();
  if (!val) return;
  state.homework.push({ id: Date.now(), text: val, subject, done: false });
  saveState();
  updateHomeworkUI();
  input.value = "";
}

function toggleHomework(id) {
  const hw = state.homework.find((h) => h.id === id);
  if (hw) {
    hw.done = !hw.done;
    if (hw.done) state.analytics.tasksCompleted++;
    saveState();
    updateHomeworkUI();
    updateAnalyticsUI();
  }
}

function deleteHomework(id) {
  state.homework = state.homework.filter((h) => h.id !== id);
  saveState();
  updateHomeworkUI();
}

function updateHomeworkUI() {
  const list = document.getElementById("hw-list");
  const done = state.homework.filter((h) => h.done).length;
  const total = state.homework.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("hw-count").textContent = `${done}/${total} done`;
  document.getElementById("hw-pct").textContent = `${pct}%`;
  document.getElementById("hw-fill").style.width = `${pct}%`;

  if (total === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📚</div>No homework added yet</div>';
    return;
  }

  list.innerHTML = state.homework
    .map(
      (h) => `
    <div class="hw-row">
      <div class="hw-check ${h.done ? "done" : ""}" onclick="toggleHomework(${h.id})">
        ${h.done ? "✓" : ""}
      </div>
      <span class="hw-subject ${subjectClass(h.subject)}">${escapeHTML(h.subject.toUpperCase())}</span>
      <span class="hw-name ${h.done ? "done" : ""}">${escapeHTML(h.text)}</span>
      <button class="delete-btn" onclick="deleteHomework(${h.id})">✕</button>
    </div>`,
    )
    .join("");
}

function addRevision() {
  const input = document.getElementById("rev-input");
  const subject = document.getElementById("rev-subject").value;
  const val = input.value.trim();
  if (!val) return;
  state.revision.push({
    id: Date.now(),
    text: val,
    subject,
    done: false,
    lastRevised: new Date().toLocaleDateString(),
  });
  saveState();
  updateRevisionUI();
  input.value = "";
}

function toggleRevision(id) {
  const revision = state.revision.find((r) => r.id === id);
  if (revision) {
    revision.done = !revision.done;
    revision.lastRevised = new Date().toLocaleDateString();
    if (revision.done) state.analytics.tasksCompleted++;
    saveState();
    updateRevisionUI();
    updateAnalyticsUI();
  }
}

function deleteRevision(id) {
  state.revision = state.revision.filter((r) => r.id !== id);
  saveState();
  updateRevisionUI();
}

function updateRevisionUI() {
  const list = document.getElementById("revision-list");
  state.revision = state.revision.map((r) => ({ ...r, done: Boolean(r.done) }));
  const done = state.revision.filter((r) => r.done).length;
  const total = state.revision.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("rev-count").textContent = `${done}/${total} done`;
  document.getElementById("rev-pct").textContent = `${pct}%`;
  document.getElementById("rev-fill").style.width = `${pct}%`;

  if (total === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">🔄</div>No revision topics added</div>';
    return;
  }

  list.innerHTML = state.revision
    .map(
      (r) => `
    <div class="hw-row">
      <div class="hw-check ${r.done ? "done" : ""}" onclick="toggleRevision(${r.id})">
        ${r.done ? "✓" : ""}
      </div>
      <span class="hw-subject ${subjectClass(r.subject)}">${escapeHTML(r.subject.toUpperCase())}</span>
      <span class="hw-name ${r.done ? "done" : ""}">${escapeHTML(r.text)}</span>
      <button class="delete-btn" onclick="deleteRevision(${r.id})">✕</button>
    </div>`,
    )
    .join("");
}

function addGoal() {
  const input = document.getElementById("goal-input");
  const val = input.value.trim();
  if (!val) return;
  state.goals.push({ id: Date.now(), text: val, done: false });
  saveState();
  updateGoalsUI();
  input.value = "";
}

function toggleGoal(id) {
  const goal = state.goals.find((g) => g.id === id);
  if (goal) goal.done = !goal.done;
  saveState();
  updateGoalsUI();
  updateAnalyticsUI();
}

function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  saveState();
  updateGoalsUI();
}

function updateGoalsUI() {
  const list = document.getElementById("goals-list");
  const done = state.goals.filter((g) => g.done).length;
  const total = state.goals.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("goals-count").textContent = `${done}/${total} done`;
  document.getElementById("goals-pct").textContent = `${pct}%`;
  document.getElementById("goals-fill").style.width = `${pct}%`;

  if (total === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">🎯</div>No goals set for today</div>';
    return;
  }

  list.innerHTML = state.goals
    .map(
      (g) => `
    <div class="todo-item">
      <div class="todo-check ${g.done ? "done" : ""}" onclick="toggleGoal(${g.id})">
        ${g.done ? "✓" : ""}
      </div>
      <span class="todo-text ${g.done ? "done" : ""}">${escapeHTML(g.text)}</span>
      <button class="delete-btn" onclick="deleteGoal(${g.id})">✕</button>
    </div>`,
    )
    .join("");
}

function countUp(elementId, targetValue, isFloat = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const duration = 1000;
  const steps = 30;
  const stepTime = Math.max(16, Math.floor(duration / steps));

  let currentVal = parseFloat(element.textContent) || 0;
  targetValue = parseFloat(targetValue);

  if (currentVal === targetValue) {
    element.textContent = isFloat ? targetValue.toFixed(1) + "h" : targetValue;
    return;
  }
  const stepVal = (targetValue - currentVal) / steps;
  let currentStep = 0;

  const timer = setInterval(() => {
    currentStep++;
    currentVal += stepVal;
    element.textContent = isFloat
      ? currentVal.toFixed(1) + "h"
      : Math.round(currentVal);
    if (currentStep >= steps) {
      element.textContent = isFloat
        ? targetValue.toFixed(1) + "h"
        : targetValue;
      clearInterval(timer);
    }
  }, stepTime);
}

function updateAnalyticsUI() {
  countUp("an-today", state.analytics.hoursToday, true);
  countUp("an-homework", state.homework.filter((h) => h.done).length, false);
  countUp("an-revision", state.revision.filter((r) => r.done).length, false);
  countUp("an-goals", state.goals.filter((g) => g.done).length, false);
}

function updateAllUI() {
  updateTodoUI();
  updateHomeworkUI();
  updateRevisionUI();
  updateGoalsUI();
  updateRoutineUI();
  updateAnalyticsUI();
  updateSubjectDropdowns();
}

// ----------------------------- Routine
function updateRoutineUI() {
  const headRow = document.getElementById("routine-head-row");
  const body = document.getElementById("routine-body");
  if (!headRow || !body) return;
  state.routine = normalizeRoutine(state.routine);

  headRow.innerHTML = `
    <th scope="col" class="routine-day-cell">
      <div class="routine-static-header">${escapeHTML(state.routine.dayHeader)}</div>
    </th>
    ${state.routine.headers
      .map(
        (header) => `
      <th scope="col"><div class="routine-static-header">${escapeHTML(header)}</div></th>
    `,
      )
      .join("")}`;

  body.innerHTML = state.routine.days
    .map(
      (day, dayIndex) => `
    <tr>
      <th scope="row" class="routine-day-cell"><div class="routine-static-day">${escapeHTML(day.name)}</div></th>
      ${day.slots
        .map(
          (slot, slotIndex) => `
        <td>
          <div class="routine-slot">
            <input class="routine-time-input" value="${escapeHTML(slot.time)}" placeholder="Time" data-routine-field="time" data-day-index="${dayIndex}" data-slot-index="${slotIndex}" />
            <input class="routine-subject-input" value="${escapeHTML(slot.subject)}" placeholder="Subject" data-routine-field="subject" data-day-index="${dayIndex}" data-slot-index="${slotIndex}" />
            <div class="routine-note-wrap">
              <textarea class="routine-note-input" style="height: ${clamp(Number.parseInt(slot.noteHeight, 10) || ROUTINE_NOTE_MIN_HEIGHT, ROUTINE_NOTE_MIN_HEIGHT, ROUTINE_NOTE_MAX_HEIGHT)}px" placeholder="Topic or note" data-routine-field="note" data-day-index="${dayIndex}" data-slot-index="${slotIndex}">${escapeHTML(slot.note)}</textarea>
              <button class="routine-resize-handle" type="button" aria-label="Resize topic note" data-routine-resize-handle data-day-index="${dayIndex}" data-slot-index="${slotIndex}"></button>
            </div>
          </div>
        </td>
      `,
        )
        .join("")}
    </tr>`,
    )
    .join("");
}

function updateRoutineField(input) {
  const field = input.dataset.routineField;
  const dayIndex = Number.parseInt(input.dataset.dayIndex, 10);
  const slotIndex = Number.parseInt(input.dataset.slotIndex, 10);
  state.routine = normalizeRoutine(state.routine);

  if (field === "dayHeader") state.routine.dayHeader = input.value;
  else if (field === "header" && Number.isInteger(slotIndex))
    state.routine.headers[slotIndex] = input.value;
  else if (field === "day" && Number.isInteger(dayIndex))
    state.routine.days[dayIndex].name = input.value;
  else if (
    ["time", "subject", "note"].includes(field) &&
    Number.isInteger(dayIndex) &&
    Number.isInteger(slotIndex)
  ) {
    state.routine.days[dayIndex].slots[slotIndex][field] = input.value;
  }
  saveState();
  flashRoutineStatus();
}

function updateRoutineNoteHeight(dayIndex, slotIndex, height) {
  state.routine = normalizeRoutine(state.routine);
  if (
    Number.isInteger(dayIndex) &&
    Number.isInteger(slotIndex) &&
    state.routine.days[dayIndex]?.slots[slotIndex]
  ) {
    state.routine.days[dayIndex].slots[slotIndex].noteHeight = clamp(
      Math.round(height),
      ROUTINE_NOTE_MIN_HEIGHT,
      ROUTINE_NOTE_MAX_HEIGHT,
    );
    saveState();
    flashRoutineStatus();
  }
}

let routineStatusTimeout = null;
function flashRoutineStatus() {
  const status = document.getElementById("routine-status");
  if (!status) return;
  status.textContent = "Saving";
  clearTimeout(routineStatusTimeout);
  routineStatusTimeout = setTimeout(() => {
    status.textContent = "Saved";
  }, 900);
}

function isRoutinePanelOpen() {
  const button = document.getElementById("routine-toggle");
  return button && button.getAttribute("aria-expanded") === "true";
}

function closeRoutinePanel() {
  const panel = document.getElementById("weekly-routine-panel");
  const button = document.getElementById("routine-toggle");
  if (!panel || !button) return;
  panel.classList.remove("is-open");
  button.classList.remove("is-open");
  button.setAttribute("aria-expanded", "false");
  setTimeout(() => {
    if (!panel.classList.contains("is-open")) panel.hidden = true;
  }, 240);
}

function toggleRoutinePanel() {
  const panel = document.getElementById("weekly-routine-panel");
  const button = document.getElementById("routine-toggle");
  if (!panel || !button) return;
  if (isRoutinePanelOpen()) {
    closeRoutinePanel();
    button.focus();
    return;
  }
  updateRoutineUI();
  panel.hidden = false;
  button.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    panel.classList.add("is-open");
  });
}

function initRoutinePanel() {
  const panel = document.getElementById("weekly-routine-panel");
  const button = document.getElementById("routine-toggle");
  if (!panel || !button) return;

  panel.addEventListener("input", (event) => {
    if (event.target.matches("[data-routine-field]"))
      updateRoutineField(event.target);
  });

  panel.addEventListener("pointerdown", (event) => {
    const resizeHandle = event.target.closest("[data-routine-resize-handle]");
    if (resizeHandle) {
      const note = resizeHandle
        .closest(".routine-note-wrap")
        ?.querySelector(".routine-note-input");
      if (!note) return;
      event.preventDefault();
      resizeHandle.setPointerCapture(event.pointerId);
      panel.classList.add("is-resizing");

      const startY = event.clientY,
        startHeight = note.offsetHeight;
      const dayIndex = Number.parseInt(resizeHandle.dataset.dayIndex, 10);
      const slotIndex = Number.parseInt(resizeHandle.dataset.slotIndex, 10);
      let nextHeight = startHeight,
        frame = null;

      const applyHeight = () => {
        frame = null;
        note.style.height = `${nextHeight}px`;
      };
      const onPointerMove = (moveEvent) => {
        nextHeight = clamp(
          startHeight + moveEvent.clientY - startY,
          ROUTINE_NOTE_MIN_HEIGHT,
          ROUTINE_NOTE_MAX_HEIGHT,
        );
        if (frame === null) frame = requestAnimationFrame(applyHeight);
      };
      const finishResize = () => {
        if (frame !== null) {
          cancelAnimationFrame(frame);
          applyHeight();
        }
        panel.classList.remove("is-resizing");
        resizeHandle.removeEventListener("pointermove", onPointerMove);
        resizeHandle.removeEventListener("pointerup", finishResize);
        resizeHandle.removeEventListener("pointercancel", finishResize);
        updateRoutineNoteHeight(dayIndex, slotIndex, nextHeight);
      };
      resizeHandle.addEventListener("pointermove", onPointerMove);
      resizeHandle.addEventListener("pointerup", finishResize);
      resizeHandle.addEventListener("pointercancel", finishResize);
    }
  });

  document.addEventListener("click", (event) => {
    if (!isRoutinePanelOpen()) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    closeRoutinePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (isRoutinePanelOpen()) closeRoutinePanel();
      const subjectModal = document.getElementById("subject-modal-backdrop");
      if (subjectModal && subjectModal.classList.contains("is-open"))
        closeSubjectModal();
    }
  });
}

// ----------------------------- Tick/Timers
let tickerWorker = null,
  fallbackTickerInterval = null;
function handleTick() {
  handleTimerTick();
  handlePomodoroTick();
}

try {
  tickerWorker = new Worker("timer-worker.js");
  tickerWorker.addEventListener("message", (event) => {
    if (event.data?.type === "tick") handleTick();
  });
} catch (e) {
  /* fallback active */
}

function startTicker() {
  if (tickerWorker) tickerWorker.postMessage({ type: "start" });
  else if (!fallbackTickerInterval)
    fallbackTickerInterval = setInterval(handleTick, 250);
}

function stopTickerIfIdle() {
  if (timerRunning || pomodoroRunning) return;
  if (tickerWorker) tickerWorker.postMessage({ type: "stop" });
  else if (fallbackTickerInterval) {
    clearInterval(fallbackTickerInterval);
    fallbackTickerInterval = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) handleTick();
});

// ----------------------------- Timer Display Logic
// (pad() lives in common.js)
function animateFlipPart(id, nextValue, previousValue, shouldAnimate) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.querySelector(".flip-top"),
    bottom = el.querySelector(".flip-bottom");
  const flapTop = el.querySelector(".flap-top"),
    flapBottom = el.querySelector(".flap-bottom");

  if (!top || !bottom) {
    if (nextValue !== previousValue) el.textContent = nextValue;
    return;
  }

  if (
    nextValue === previousValue ||
    !shouldAnimate ||
    previousValue === null ||
    el.classList.contains("is-flipping")
  ) {
    top.innerHTML = `<span>${nextValue}</span>`;
    bottom.innerHTML = `<span>${nextValue}</span>`;
    if (flapTop) flapTop.innerHTML = `<span>${nextValue}</span>`;
    if (flapBottom) flapBottom.innerHTML = `<span>${nextValue}</span>`;
    return;
  }

  if (el.flipTimeout) clearTimeout(el.flipTimeout);

  if (flapTop && flapBottom) {
    flapTop.innerHTML = `<span>${previousValue}</span>`;
    flapBottom.innerHTML = `<span>${nextValue}</span>`;
  }
  top.innerHTML = `<span>${nextValue}</span>`;
  bottom.innerHTML = `<span>${previousValue}</span>`;

  el.classList.remove("is-flipping");
  void el.offsetWidth; // Reflow necessary for CSS re-trigger
  el.classList.add("is-flipping");

  el.flipTimeout = setTimeout(() => {
    top.innerHTML = `<span>${nextValue}</span>`;
    bottom.innerHTML = `<span>${nextValue}</span>`;
    if (flapTop) flapTop.innerHTML = `<span>${nextValue}</span>`;
    if (flapBottom) flapBottom.innerHTML = `<span>${nextValue}</span>`;
    el.classList.remove("is-flipping");
    el.flipTimeout = null;
  }, 950);
}

// ----------------------------- Countdown Timer
let timerSec = 25 * 60,
  plannedTimerSec = 25 * 60,
  timerRunning = false,
  timerEndAt = null;
let previousFlipValues = { h: null, m: null, s: null };

function updateFlip(shouldAnimate = true) {
  const next = {
    h: pad(Math.floor(timerSec / 3600)),
    m: pad(Math.floor((timerSec % 3600) / 60)),
    s: pad(timerSec % 60),
  };
  animateFlipPart("flip-h", next.h, previousFlipValues.h, shouldAnimate);
  animateFlipPart("flip-m", next.m, previousFlipValues.m, shouldAnimate);
  animateFlipPart("flip-s", next.s, previousFlipValues.s, shouldAnimate);
  previousFlipValues = next;
}

function setTimer(mins) {
  stopTimer();
  plannedTimerSec = mins * 60;
  timerSec = plannedTimerSec;
  document.getElementById("clock-mode-label").textContent = "Focus Mode";
  updateFlip();
}

function applyCustomTimer() {
  const h =
    Number.parseInt(document.getElementById("custom-hours").value, 10) || 0;
  const m =
    Number.parseInt(document.getElementById("custom-minutes").value, 10) || 0;
  const s =
    Number.parseInt(document.getElementById("custom-seconds").value, 10) || 0;
  const total = Math.min(h, 23) * 3600 + Math.min(m, 59) * 60 + Math.min(s, 59);

  if (total === 0) {
    document.getElementById("clock-mode-label").textContent = "Set a time";
    return;
  }
  stopTimer();
  plannedTimerSec = total;
  timerSec = plannedTimerSec;
  document.getElementById("clock-mode-label").textContent = "Custom";
  updateFlip();
}

function stopTimer() {
  timerRunning = false;
  timerEndAt = null;
  document.getElementById("start-btn").textContent = "▶ Start";
  stopTickerIfIdle();
}

function completeTimer() {
  stopTimer();
  state.analytics.sessions++;
  state.analytics.hoursToday += plannedTimerSec / 3600;
  state.timerData.totalMinutesStudied += plannedTimerSec / 60;
  document.getElementById("sessions-done").textContent =
    state.analytics.sessions;
  document.getElementById("hours-today").textContent =
    state.analytics.hoursToday.toFixed(1);
  saveState();
  updateAnalyticsUI();
  if (window.AlarmManager)
    window.AlarmManager.trigger({
      title: "⏰ Timer complete!",
      body: "Your focus session has ended — nice work!",
    });
}

function handleTimerTick() {
  if (!timerRunning) return;
  const remaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
  if (remaining !== timerSec) {
    timerSec = remaining;
    updateFlip();
  }
  if (remaining <= 0) completeTimer();
}

function toggleTimer() {
  const btn = document.getElementById("start-btn");
  if (timerRunning) {
    timerSec = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    stopTimer();
    btn.textContent = "▶ Start";
  } else {
    if (window.AlarmManager) {
      window.AlarmManager.unlockAudio();
      window.AlarmManager.requestNotificationPermission();
    }
    timerRunning = true;
    timerEndAt = Date.now() + timerSec * 1000;
    btn.textContent = "⏸ Pause";
    startTicker();
  }
}

function resetTimer() {
  stopTimer();
  timerSec = plannedTimerSec;
  updateFlip();
}

// ----------------------------- RAF Stopwatch (Optimized to skip setInterval layout thrashing)
let swElapsed = 0,
  swRunning = false,
  swStartTime = 0,
  swLaps = [];
let swPreviousFlip = { h: null, m: null, s: null, ms: null };
let swRafFrame;

function updateSwFlip(shouldAnimate = true) {
  const totalSec = Math.floor(swElapsed / 1000);
  const next = {
    h: pad(Math.floor(totalSec / 3600)),
    m: pad(Math.floor((totalSec % 3600) / 60)),
    s: pad(totalSec % 60),
    ms: pad(Math.floor((swElapsed % 1000) / 10)),
  };

  animateFlipPart("sw-flip-h", next.h, swPreviousFlip.h, shouldAnimate);
  animateFlipPart("sw-flip-m", next.m, swPreviousFlip.m, shouldAnimate);
  animateFlipPart("sw-flip-s", next.s, swPreviousFlip.s, shouldAnimate);

  const msEl = document.getElementById("sw-flip-ms");
  if (msEl && next.ms !== swPreviousFlip.ms) msEl.textContent = next.ms;
  swPreviousFlip = next;
}

function formatSwTime(ms) {
  const totalSec = Math.floor(ms / 1000),
    h = Math.floor(totalSec / 3600),
    m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60,
    centis = Math.floor((ms % 1000) / 10);
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(centis)}`
    : `${pad(m)}:${pad(s)}.${pad(centis)}`;
}

function toggleStopwatch() {
  const btn = document.getElementById("sw-start-btn");
  const lapBtn = document.getElementById("sw-lap-btn");

  if (swRunning) {
    cancelAnimationFrame(swRafFrame);
    swElapsed += Date.now() - swStartTime;
    swRunning = false;
    btn.textContent = "▶ Resume";
    lapBtn.disabled = true;
  } else {
    swRunning = true;
    swStartTime = Date.now();
    btn.textContent = "⏸ Pause";
    lapBtn.disabled = false;

    function step() {
      const saved = swElapsed;
      swElapsed = saved + (Date.now() - swStartTime);
      updateSwFlip();
      swElapsed = saved;
      swRafFrame = requestAnimationFrame(step);
    }
    swRafFrame = requestAnimationFrame(step);
  }
}

function lapStopwatch() {
  if (!swRunning) return;
  const currentTotal = swElapsed + (Date.now() - swStartTime);
  const diffMs =
    swLaps.length > 0 ? currentTotal - swLaps[0].totalMs : currentTotal;
  swLaps.unshift({ num: swLaps.length + 1, totalMs: currentTotal, diffMs });
  updateLapListUI();
}

function resetStopwatch() {
  cancelAnimationFrame(swRafFrame);
  swRunning = false;
  swElapsed = 0;
  swLaps = [];
  swPreviousFlip = { h: null, m: null, s: null, ms: null };
  document.getElementById("sw-start-btn").textContent = "▶ Start";
  document.getElementById("sw-lap-btn").disabled = true;
  updateSwFlip(false);
  updateLapListUI();
}

function updateLapListUI() {
  document.getElementById("lap-list").innerHTML = swLaps
    .map(
      (lap) => `
    <div class="lap-item">
      <span class="lap-num">Lap ${lap.num}</span>
      <span class="lap-diff">+${formatSwTime(lap.diffMs)}</span>
      <span class="lap-time">${formatSwTime(lap.totalMs)}</span>
    </div>`,
    )
    .join("");
}

// ----------------------------- Clock Tabs
function switchClockTab(tab) {
  ["timer", "stopwatch", "pomodoro"].forEach((t) => {
    document.getElementById(`tab-${t}`).classList.remove("active");
    document.getElementById(`panel-${t}`).classList.remove("active");
  });
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.getElementById(`panel-${tab}`).classList.add("active");

  const modeLabel = document.getElementById("clock-mode-label");
  if (tab === "timer")
    modeLabel.textContent = timerRunning ? "Counting Down" : "Focus Mode";
  else if (tab === "stopwatch")
    modeLabel.textContent = swRunning ? "Running" : "Stopwatch";
  else if (tab === "pomodoro")
    modeLabel.textContent = pomodoroRunning
      ? pomodoroPhase === "work"
        ? "Working"
        : "Break"
      : "Pomodoro";
  updateClockTabIndicator();
}

function updateClockTabIndicator() {
  const tabs = document.getElementById("clock-tabs"),
    indicator = document.getElementById("tab-indicator");
  const activeTab = tabs?.querySelector(".clock-tab.active");
  if (!indicator || !activeTab) return;
  requestAnimationFrame(() => {
    indicator.style.setProperty(
      "--tab-indicator-width",
      `${activeTab.offsetWidth}px`,
    );
    indicator.style.setProperty(
      "--tab-indicator-x",
      `${activeTab.offsetLeft}px`,
    );
  });
}

function initClockTabs() {
  updateClockTabIndicator();
  window.addEventListener("resize", updateClockTabIndicator, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(updateClockTabIndicator);
}

// NOTE: initCustomCursor() and initScrollReveal() now live in common.js
// and run for every page. setupMidnightRefresh() (below) is Home-page
// specific since it touches the on-page "last refreshed" tag and
// re-renders the dashboard.

// ----------------------------- Init (Home page only)
// common.js already loads state, runs the daily-reset check, and sets
// up the date/dark-mode/cursor/scroll-reveal behavior shared by every
// page (registered on "load" before this listener, so `state` is ready
// by the time this callback runs). This listener only wires up the
// Home-page-specific UI: dashboard rendering, clocks, and panels.
window.addEventListener("load", () => {
  updateAllUI();
  updateFlip(false);
  updateSwFlip(false);
  document.getElementById("sessions-done").textContent =
    state.analytics.sessions;
  document.getElementById("hours-today").textContent =
    state.analytics.hoursToday.toFixed(1);
  setupMidnightRefresh();
  initRoutinePanel();
  initClockTabs();
  updatePomodoroFlip(false);
});

// ----------------------------- Pomodoro
const POMO_WORK = 25 * 60,
  POMO_SHORT_BREAK = 5 * 60,
  POMO_LONG_BREAK = 15 * 60,
  POMO_SESSIONS_BEFORE_LONG = 4;
let pomodoroSec = POMO_WORK,
  pomodoroRunning = false,
  pomodoroEndAt = null,
  pomodoroPhase = "work",
  pomodoroSession = 1;
let pomoPreviousFlip = { h: null, m: null, s: null };

function updatePomodoroFlip(shouldAnimate = true) {
  const next = {
    h: pad(Math.floor(pomodoroSec / 3600)),
    m: pad(Math.floor((pomodoroSec % 3600) / 60)),
    s: pad(pomodoroSec % 60),
  };
  animateFlipPart("pomo-flip-h", next.h, pomoPreviousFlip.h, shouldAnimate);
  animateFlipPart("pomo-flip-m", next.m, pomoPreviousFlip.m, shouldAnimate);
  animateFlipPart("pomo-flip-s", next.s, pomoPreviousFlip.s, shouldAnimate);
  pomoPreviousFlip = next;
}

function updatePomodoroStatus() {
  const phaseEl = document.getElementById("pomo-phase");
  if (pomodoroPhase === "work") {
    phaseEl.textContent = "Work Session";
    phaseEl.classList.remove("is-break");
  } else {
    phaseEl.textContent =
      pomodoroPhase === "shortBreak" ? "Short Break" : "Long Break";
    phaseEl.classList.add("is-break");
  }
  document.getElementById("pomo-session").textContent =
    `Session ${pomodoroSession} / ${POMO_SESSIONS_BEFORE_LONG}`;
}

function completePomodoroPhase() {
  pomodoroRunning = false;
  pomodoroEndAt = null;
  stopTickerIfIdle();
  const completedPhase = pomodoroPhase;

  if (pomodoroPhase === "work") {
    state.analytics.sessions++;
    state.analytics.hoursToday += POMO_WORK / 3600;
    state.timerData.totalMinutesStudied += POMO_WORK / 60;
    document.getElementById("sessions-done").textContent =
      state.analytics.sessions;
    document.getElementById("hours-today").textContent =
      state.analytics.hoursToday.toFixed(1);
    saveState();
    updateAnalyticsUI();
    pomodoroPhase =
      pomodoroSession >= POMO_SESSIONS_BEFORE_LONG ? "longBreak" : "shortBreak";
    pomodoroSec =
      pomodoroPhase === "longBreak" ? POMO_LONG_BREAK : POMO_SHORT_BREAK;
  } else {
    pomodoroSession = pomodoroPhase === "longBreak" ? 1 : pomodoroSession + 1;
    pomodoroPhase = "work";
    pomodoroSec = POMO_WORK;
  }
  updatePomodoroFlip(false);
  updatePomodoroStatus();
  document.getElementById("pomo-start-btn").textContent = "▶ Start";

  if (document.getElementById("tab-pomodoro").classList.contains("active"))
    document.getElementById("clock-mode-label").textContent = "Pomodoro";
  if (window.AlarmManager)
    window.AlarmManager.trigger({
      title:
        completedPhase === "work"
          ? "⏰ Work session complete!"
          : "⏰ Break's over!",
      body:
        completedPhase === "work"
          ? "Time for a break."
          : "Time to get back to work.",
    });
}

function handlePomodoroTick() {
  if (!pomodoroRunning) return;
  const remaining = Math.max(0, Math.ceil((pomodoroEndAt - Date.now()) / 1000));
  if (remaining !== pomodoroSec) {
    pomodoroSec = remaining;
    updatePomodoroFlip();
  }
  if (remaining <= 0) completePomodoroPhase();
}

function togglePomodoro() {
  const btn = document.getElementById("pomo-start-btn");
  if (pomodoroRunning) {
    pomodoroSec = Math.max(0, Math.ceil((pomodoroEndAt - Date.now()) / 1000));
    pomodoroRunning = false;
    pomodoroEndAt = null;
    btn.textContent = "▶ Resume";
    stopTickerIfIdle();
    if (document.getElementById("tab-pomodoro").classList.contains("active"))
      document.getElementById("clock-mode-label").textContent = "Paused";
  } else {
    if (window.AlarmManager) {
      window.AlarmManager.unlockAudio();
      window.AlarmManager.requestNotificationPermission();
    }
    pomodoroRunning = true;
    pomodoroEndAt = Date.now() + pomodoroSec * 1000;
    btn.textContent = "⏸ Pause";
    if (document.getElementById("tab-pomodoro").classList.contains("active"))
      document.getElementById("clock-mode-label").textContent =
        pomodoroPhase === "work" ? "Working" : "Break";
    startTicker();
  }
}

function resetPomodoro() {
  pomodoroRunning = false;
  pomodoroEndAt = null;
  stopTickerIfIdle();
  pomodoroPhase = "work";
  pomodoroSession = 1;
  pomodoroSec = POMO_WORK;
  pomoPreviousFlip = { h: null, m: null, s: null };
  document.getElementById("pomo-start-btn").textContent = "▶ Start";
  updatePomodoroFlip(false);
  updatePomodoroStatus();
  if (document.getElementById("tab-pomodoro").classList.contains("active"))
    document.getElementById("clock-mode-label").textContent = "Pomodoro";
}

// ----------------------------- Subject Management
// (Dark mode — DARK_MODE_KEY / initDarkMode() / toggleDarkMode() — now
// lives in common.js so both pages share the exact same behavior.)

let editingSubjectId = null;
function openSubjectModal() {
  const modal = document.getElementById("subject-modal-backdrop");
  if (!modal) return;
  editingSubjectId = null;
  document.getElementById("new-subject-input").value = "";
  document.getElementById("subject-modal-error").textContent = "";
  renderSubjectManagerList();
  modal.classList.add("is-open");
}
function closeSubjectModal() {
  const modal = document.getElementById("subject-modal-backdrop");
  if (modal) modal.classList.remove("is-open");
}

function renderSubjectManagerList() {
  const listEl = document.getElementById("subject-manager-list");
  if (!listEl) return;
  listEl.innerHTML = state.subjects
    .map((s) =>
      editingSubjectId === s.id
        ? `
    <div class="subject-item-row">
      <input type="text" class="subject-item-input" id="edit-subj-${s.id}" value="${escapeHTML(s.name)}" onkeydown="if (event.key === 'Enter') saveSubjectName('${s.id}');" />
      <div class="subject-item-actions">
        <button class="delete-btn" onclick="saveSubjectName('${s.id}')" title="Save" style="color: #16a34a;">✓</button>
        <button class="delete-btn" onclick="cancelEditSubject()" title="Cancel" style="color: #ef4444;">✕</button>
      </div>
    </div>
  `
        : `
    <div class="subject-item-row">
      <span class="subject-item-name">${escapeHTML(s.name)}</span>
      <div class="subject-item-actions">
        <button class="delete-btn" onclick="startEditSubject('${s.id}')" title="Edit">✏️</button>
        <button class="delete-btn" onclick="deleteSubject('${s.id}')" title="Delete">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function addNewSubject() {
  const input = document.getElementById("new-subject-input"),
    errorEl = document.getElementById("subject-modal-error");
  const val = input.value.trim();
  if (!val) {
    errorEl.textContent = "Subject name cannot be empty.";
    return;
  }
  if (state.subjects.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
    errorEl.textContent = "Subject already exists.";
    return;
  }
  state.subjects.push({
    id: "sub-" + Date.now(),
    name: val,
    short: deriveShortForm(val),
  });
  saveState();
  updateSubjectDropdowns();
  renderSubjectManagerList();
  input.value = "";
  errorEl.textContent = "";
}

function startEditSubject(id) {
  editingSubjectId = id;
  renderSubjectManagerList();
  const input = document.getElementById(`edit-subj-${id}`);
  if (input) {
    input.focus();
    input.select();
  }
}
function cancelEditSubject() {
  editingSubjectId = null;
  renderSubjectManagerList();
  document.getElementById("subject-modal-error").textContent = "";
}

function saveSubjectName(id) {
  const val = document.getElementById(`edit-subj-${id}`).value.trim(),
    errorEl = document.getElementById("subject-modal-error");
  if (!val) {
    errorEl.textContent = "Subject name cannot be empty.";
    return;
  }
  if (
    state.subjects.some(
      (s) => s.id !== id && s.name.toLowerCase() === val.toLowerCase(),
    )
  ) {
    errorEl.textContent = "Subject already exists.";
    return;
  }

  const subject = state.subjects.find((s) => s.id === id);
  if (subject) {
    const oldShort = subject.short;
    subject.name = val;
    subject.short = deriveShortForm(val);
    let changed = false;
    [state.homework, state.revision].forEach((list) =>
      list.forEach((item) => {
        if (item.subject === oldShort) {
          item.subject = subject.short;
          changed = true;
        }
      }),
    );
    if (changed) saveState();
    updateSubjectDropdowns();
    updateAllUI();
  }
  editingSubjectId = null;
  renderSubjectManagerList();
  errorEl.textContent = "";
}

function deleteSubject(id) {
  if (
    confirm(
      `Are you sure you want to delete "${state.subjects.find((s) => s.id === id)?.name}"?`,
    )
  ) {
    state.subjects = state.subjects.filter((s) => s.id !== id);
    saveState();
    updateSubjectDropdowns();
    renderSubjectManagerList();
    document.getElementById("subject-modal-error").textContent = "";
  }
}

function confirmResetSubjects() {
  if (confirm("Are you sure you want to reset all subjects to the defaults?")) {
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
    state.subjectsInitialized = true;
    saveState();
    updateSubjectDropdowns();
    renderSubjectManagerList();
    document.getElementById("subject-modal-error").textContent = "";
  }
}

function updateSubjectDropdowns() {
  const hwSelect = document.getElementById("hw-subject"),
    revSelect = document.getElementById("rev-subject");
  if (!hwSelect || !revSelect) return;
  const currentHwVal = hwSelect.value,
    currentRevVal = revSelect.value;
  const optionsHTML = state.subjects
    .map(
      (s) =>
        `<option value="${escapeHTML(s.short)}">${escapeHTML(s.name)}</option>`,
    )
    .join("");
  hwSelect.innerHTML = optionsHTML;
  revSelect.innerHTML = optionsHTML;
  if (state.subjects.some((s) => s.short === currentHwVal))
    hwSelect.value = currentHwVal;
  if (state.subjects.some((s) => s.short === currentRevVal))
    revSelect.value = currentRevVal;
}
