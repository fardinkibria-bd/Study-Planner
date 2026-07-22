/* ═══════════════════════════════════════════════════════════════════
   SHARED HEADER & NAVIGATION
   ───────────────────────────────────────────────────────────────────
   Injects the top header (title, dark-mode toggle, current date) plus
   the persistent Home / Reports nav bar into the page. Reports now
   lives as an in-page tab inside index.html (see #page-home /
   #page-reports), so the nav switches between those sections instead
   of navigating to a separate reports.html document.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const NAV_ITEMS = [
    { page: "home", icon: "🏠", label: "Home" },
    { page: "reports", icon: "📊", label: "Reports" },
  ];

  let currentPage = "home";

  function renderHeader() {
    const mount = document.getElementById("app-header");
    if (!mount) return;

    currentPage = document.body.getAttribute("data-page") || "home";

    const navHTML = NAV_ITEMS.map((item) => {
      const isActive = item.page === currentPage;
      return `
        <button
          type="button"
          class="app-nav-tab${isActive ? " active" : ""}"
          data-nav-page="${item.page}"
          ${isActive ? 'aria-current="page"' : ""}
          onclick="switchMainTab('${item.page}')"
        >
          <span class="app-nav-icon" aria-hidden="true">${item.icon}</span>
          <span class="app-nav-label">${item.label}</span>
        </button>`;
    }).join("");

    mount.innerHTML = `
      <div class="hero reveal-on-scroll">
        <div class="hero-glow"></div>
        <div class="hero-top">
          <div>
            <div class="hero-title">🌿 Study Planner</div>
            <div class="hero-sub">Your premium productivity workspace</div>
          </div>
          <div class="hero-right">
            <button
              class="dark-mode-toggle"
              id="dark-mode-toggle"
              onclick="toggleDarkMode()"
              aria-label="Toggle dark mode"
            >
              <span class="toggle-icon" id="toggle-icon">🌙</span>
            </button>
            <div class="date-box" id="live-date"></div>
          </div>
        </div>
      </div>
      <nav class="app-nav" aria-label="Primary">
        ${navHTML}
      </nav>
    `;
  }

  // Switches between the Home dashboard and the Reports tab without
  // leaving the page. Keeps body[data-page] and the nav's active/
  // aria-current state in sync, and asks reports.js to (re)render its
  // charts once the Reports panel actually becomes visible — Chart.js
  // can't size canvases correctly while their container is hidden.
  function switchMainTab(page) {
    if (page === currentPage) return;
    currentPage = page;
    document.body.setAttribute("data-page", page);

    document.querySelectorAll(".app-nav-tab").forEach((tab) => {
      const isActive = tab.getAttribute("data-nav-page") === page;
      tab.classList.toggle("active", isActive);
      if (isActive) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    const homePage = document.getElementById("page-home");
    const reportsPage = document.getElementById("page-reports");
    if (homePage) homePage.hidden = page !== "home";
    if (reportsPage) reportsPage.hidden = page !== "reports";

    if (page === "reports" && typeof window.refreshActiveReport === "function") {
      requestAnimationFrame(() => window.refreshActiveReport());
    }
  }
  window.switchMainTab = switchMainTab;

  // ─── Mobile bottom-nav tab switching ─────────────────────────────────
  // Mirrors switchMainTab above, but drives the mobile-only bottom nav
  // (Tasks / Clock / Reports) via body[data-mobile-tab]. All the actual
  // show/hide rules live in style.css, scoped inside the
  // @media (max-width: 768px) block, so this has zero effect on desktop.
  // Reuses the exact same Home/Reports/Clock components already on the
  // page — nothing is duplicated or re-rendered here.
  let currentMobileTab = "tasks";

  function switchMobileTab(tab) {
    if (tab === currentMobileTab) return;
    currentMobileTab = tab;
    document.body.setAttribute("data-mobile-tab", tab);

    document.querySelectorAll(".bottom-nav-tab").forEach((btn) => {
      const isActive = btn.getAttribute("data-mobile-tab") === tab;
      btn.classList.toggle("active", isActive);
      if (isActive) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    // Reports panel needs Chart.js to (re)size its canvases, which only
    // works once the panel is actually visible — same trick switchMainTab
    // uses for the desktop Reports tab.
    if (tab === "reports" && typeof window.refreshActiveReport === "function") {
      requestAnimationFrame(() => window.refreshActiveReport());
    }
  }
  window.switchMobileTab = switchMobileTab;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHeader);
  } else {
    renderHeader();
  }
})();
