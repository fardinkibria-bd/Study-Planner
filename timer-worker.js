/* ─── Timer Worker ───────────────────────────────────────────────────────
 * A dedicated worker whose only job is to post a steady "tick" message
 * roughly every 250ms. It does NOT track remaining time itself — the main
 * thread always recomputes remaining time from an absolute end-timestamp,
 * so ticks can be late, skipped, or bunched up without ever causing drift.
 *
 * Running the interval inside a worker (rather than directly on the main
 * thread) helps because browsers throttle/deprioritize timers on hidden
 * tabs less aggressively for workers than for some main-thread work, and it
 * keeps the ticking logic isolated from DOM/layout work that could delay a
 * main-thread setInterval callback.
 * ------------------------------------------------------------------------ */

let tickHandle = null;
const TICK_MS = 250;

function startTicking() {
  if (tickHandle) return; // already running
  tickHandle = setInterval(() => {
    postMessage({ type: "tick", now: Date.now() });
  }, TICK_MS);
}

function stopTicking() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

self.addEventListener("message", (event) => {
  const { type } = event.data || {};
  if (type === "start") startTicking();
  else if (type === "stop") stopTicking();
});
