/* ─── Alarm Manager ──────────────────────────────────────────────────────
 * Central place for everything related to alerting the user when the
 * countdown Timer or the Pomodoro clock reaches zero.
 * (Includes the robust Audio Autoplay Fix).
 * ------------------------------------------------------------------------ */

const AlarmManager = (() => {
  const AUDIO_SRC = "alarm.mp3";
  const MAX_LOOPS = 3; 
  const NOTIF_ASKED_KEY = "studyPlannerNotificationAsked";

  let audio = null;
  let audioUnlocked = false;
  let swRegistration = null;
  let loopCount = 0;
  let alarmActive = false;
  let banner = null;
  let bannerText = null;

  // 1. Strict Singleton with robust loop logic
  function getAudio() {
    if (!audio) {
      audio = new Audio(AUDIO_SRC);
      audio.preload = "auto";
      
      // Loop logic attached directly to the single instance
      audio.addEventListener('ended', () => {
        if (alarmActive && loopCount < MAX_LOOPS - 1) {
          loopCount++;
          audio.play().catch(() => {});
        } else {
          stopSound();
        }
      });
    }
    return audio;
  }

  // 2. Global Unlock Mechanism
  function unlockAudio() {
    if (audioUnlocked) return;
    const a = getAudio();
    
    // Play and immediately pause to authorize the audio context
    const playPromise = a.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          a.pause();
          a.currentTime = 0;
          audioUnlocked = true;
          
          // Clean up global listeners once unlocked
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        })
        .catch(() => {
          // Autoplay still blocked, will retry on next interaction
        });
    } else {
      audioUnlocked = true;
    }
  }

  // Bind the unlocker globally right away so the very first click on the page authorizes audio
  if (typeof document !== 'undefined') {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }

  // --- UI, Banner, and Notification logic ---

  function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    let alreadyAsked = false;
    try {
      alreadyAsked = localStorage.getItem(NOTIF_ASKED_KEY) === "true";
    } catch (e) {}
    if (alreadyAsked) return;

    try {
      localStorage.setItem(NOTIF_ASKED_KEY, "true");
    } catch (e) {}
    Notification.requestPermission().catch(() => {});
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        swRegistration = reg;
      })
      .catch(() => {});
  }

  function ensureBanner() {
    if (banner) return banner;

    banner = document.createElement("div");
    banner.className = "alarm-banner";
    banner.setAttribute("role", "alert");
    banner.hidden = true;

    bannerText = document.createElement("span");
    bannerText.className = "alarm-banner-text";

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "alarm-banner-btn";
    stopBtn.textContent = "🔇 Stop Alarm";
    stopBtn.addEventListener("click", stopSound);

    banner.appendChild(bannerText);
    banner.appendChild(stopBtn);
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(message) {
    ensureBanner();
    bannerText.textContent = message;
    banner.hidden = false;
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  // 3. Play and Stop Sound using the authorized singleton
  function playSound() {
    const a = getAudio();
    a.currentTime = 0;
    loopCount = 0;
    alarmActive = true;

    const playPromise = a.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Blocked without a gesture — notifications/banners still work
      });
    }
  }

  function stopSound() {
    alarmActive = false;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    hideBanner();
  }

  function showNotification(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const options = {
      body,
      icon: "logo.png",
      badge: "logo.png",
      tag: "study-planner-alarm",
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    };
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, options).catch(() => {
        try { new Notification(title, options); } catch (e) {}
      });
    } else {
      try { new Notification(title, options); } catch (e) {}
    }
  }

  function vibrateDevice() {
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  function trigger({ title = "⏰ Time's up!", body = "" } = {}) {
    playSound();
    vibrateDevice();
    showBanner(title);

    if (document.hidden) {
      showNotification(title, body);
    }
  }

  function clear() {
    stopSound();
  }

  registerServiceWorker();

  return {
    unlockAudio,
    requestNotificationPermission,
    trigger,
    stop: stopSound,
    clear,
  };
})();

// Expose on the global object. Top-level `const` in a classic script creates
// a lexical binding but does NOT become a `window` property, and every call
// site in script.js (correctly) checks `window.AlarmManager` before using it.
// Without this line, that check is always false and the alarm never fires.
if (typeof window !== "undefined") {
  window.AlarmManager = AlarmManager;
}