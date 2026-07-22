/* ═══════════════════════════════════════════════════════════════════
   REPORTS MODULE — Weekly & Monthly Report Cards
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Chart instances (so we can destroy before re-creating) ── */
  let weeklyPieChart = null;
  let weeklyPerfChart = null;
  let monthlyPieChart = null;
  let monthlyPerfChart = null;

  /* ── Active tab ── */
  let activeReportTab = "weekly";

  /* ── Day name helpers ── */
  const DAY_NAMES_SHORT = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ── Chart.js color palette (matches site design) ── */
  function getChartColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      homework: isDark ? "#6366f1" : "#2a71ffdb",
      revision: isDark ? "#06b6d4" : "#00e5ff",
      goals: isDark ? "#a78bfa" : "#8a2be2",
      gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      textColor: isDark ? "#94a3b8" : "#64748b",
      tooltipBg: isDark ? "#1e2130" : "#0f172a",
      precisionLine: isDark ? "#22d3ee" : "#2a71ff",
      barBg: isDark ? "rgba(99,102,241,0.6)" : "rgba(42,113,255,0.5)",
      barBorder: isDark ? "#6366f1" : "#2a71ff",
    };
  }

  /* ── Precision score helpers ── */
  function calculatePrecision(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  function getPrecisionLabel(pct) {
    if (pct >= 90) return { label: "Excellent", cls: "precision-excellent" };
    if (pct >= 80) return { label: "Great", cls: "precision-great" };
    if (pct >= 70) return { label: "Good", cls: "precision-good" };
    if (pct >= 50) return { label: "Average", cls: "precision-average" };
    return { label: "Needs Improvement", cls: "precision-low" };
  }

  function getPrecisionColor(pct) {
    if (pct >= 90) return "#22c55e";
    if (pct >= 80) return "#06b6d4";
    if (pct >= 70) return "#3b82f6";
    if (pct >= 50) return "#f59e0b";
    return "#ef4444";
  }

  /* ── Format helpers ── */
  function fmtHours(h) { return h.toFixed(1); }

  function formatDateShort(d) {
    return MONTH_NAMES[d.getMonth()] + " " + d.getDate();
  }

  /* ══════════════════════════════
     TAB NAVIGATION
     ══════════════════════════════ */

  function switchReportTab(tab) {
    activeReportTab = tab;
    const weeklyTab = document.getElementById("report-tab-weekly");
    const monthlyTab = document.getElementById("report-tab-monthly");
    const weeklyPanel = document.getElementById("report-panel-weekly");
    const monthlyPanel = document.getElementById("report-panel-monthly");
    const indicator = document.getElementById("report-tab-indicator");

    if (!weeklyTab || !monthlyTab) return;

    weeklyTab.classList.toggle("active", tab === "weekly");
    monthlyTab.classList.toggle("active", tab === "monthly");
    weeklyTab.setAttribute("aria-selected", String(tab === "weekly"));
    monthlyTab.setAttribute("aria-selected", String(tab === "monthly"));
    weeklyPanel?.classList.toggle("active", tab === "weekly");
    monthlyPanel?.classList.toggle("active", tab === "monthly");

    // Move indicator
    const activeTab = tab === "weekly" ? weeklyTab : monthlyTab;
    requestAnimationFrame(() => {
      indicator?.style.setProperty("--report-tab-indicator-width", `${activeTab.offsetWidth}px`);
      indicator?.style.setProperty("--report-tab-indicator-x", `${activeTab.offsetLeft}px`);
    });

    // Render active report
    if (tab === "weekly") {
      renderWeeklyReport();
    } else {
      renderMonthlyReport();
    }
  }
  // Expose globally for onclick
  window.switchReportTab = switchReportTab;

  // Expose a refresh hook for the main Home/Reports tab switcher
  // (header-nav.js). The Reports panel is hidden (via the `hidden`
  // attribute) until its tab is selected, so any Chart.js canvases
  // rendered while hidden come out sized 0x0. Calling this after the
  // panel becomes visible re-renders whichever report is currently
  // active with correct dimensions.
  window.refreshActiveReport = function () {
    if (activeReportTab === "weekly") renderWeeklyReport();
    else renderMonthlyReport();
    initReportTabIndicator();
  };

  function initReportTabIndicator() {
    const tabs = document.getElementById("report-tabs");
    const indicator = document.getElementById("report-tab-indicator");
    const activeTab = tabs?.querySelector(".report-tab.active");
    if (!tabs || !indicator || !activeTab) return;
    requestAnimationFrame(() => {
      indicator.style.setProperty("--report-tab-indicator-width", `${activeTab.offsetWidth}px`);
      indicator.style.setProperty("--report-tab-indicator-x", `${activeTab.offsetLeft}px`);
    });
  }

  /* ══════════════════════════════
     STAT CARDS RENDERING
     ══════════════════════════════ */

  function buildStatCardsHTML(data, periodLabel) {
    const totalCompleted = data.homework.completed + data.revision.completed + data.goals.completed;
    const totalPlanned = data.homework.assigned + data.revision.scheduled + data.goals.created;
    const precision = calculatePrecision(totalCompleted, totalPlanned);
    const precInfo = getPrecisionLabel(precision);
    const precColor = getPrecisionColor(precision);

    return `
      <div class="report-stats-container">
      <div class="report-stats-grid">
        <!-- Study Time Card -->
        <div class="report-stat-card rsc-study">
          <div class="rsc-icon">⏱</div>
          <div class="rsc-value">${fmtHours(data.studyHours)}h</div>
          <div class="rsc-title">Total Study Time</div>
          <div class="rsc-details">
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Sessions</span>
              <span class="rsc-detail-value">${data.sessions}</span>
            </div>
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Avg/Day</span>
              <span class="rsc-detail-value">${fmtHours(data.avgStudyPerDay)}h</span>
            </div>
          </div>
        </div>

        <!-- Homework Card -->
        <div class="report-stat-card rsc-homework">
          <div class="rsc-icon">📚</div>
          <div class="rsc-value">${data.homework.completed}</div>
          <div class="rsc-title">Homework Summary</div>
          <div class="rsc-details">
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Assigned</span>
              <span class="rsc-detail-value">${data.homework.assigned}</span>
            </div>
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Missed</span>
              <span class="rsc-detail-value rsc-missed">${data.homework.missed}</span>
            </div>
          </div>
        </div>

        <!-- Revision Card -->
        <div class="report-stat-card rsc-revision">
          <div class="rsc-icon">🔄</div>
          <div class="rsc-value">${data.revision.completed}</div>
          <div class="rsc-title">Revision Summary</div>
          <div class="rsc-details">
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Scheduled</span>
              <span class="rsc-detail-value">${data.revision.scheduled}</span>
            </div>
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Missed</span>
              <span class="rsc-detail-value rsc-missed">${data.revision.missed}</span>
            </div>
          </div>
        </div>

        <!-- Goals Card -->
        <div class="report-stat-card rsc-goals">
          <div class="rsc-icon">🎯</div>
          <div class="rsc-value">${data.goals.completed}</div>
          <div class="rsc-title">Goals Summary</div>
          <div class="rsc-details">
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Created</span>
              <span class="rsc-detail-value">${data.goals.created}</span>
            </div>
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Missed</span>
              <span class="rsc-detail-value rsc-missed">${data.goals.missed}</span>
            </div>
          </div>
        </div>

        <!-- Precision Score Card -->
        <div class="report-stat-card rsc-precision">
          <div class="rsc-icon">🎯</div>
          <div class="rsc-precision-circle" style="--precision-pct: ${precision}; --precision-color: ${precColor};">
            <div class="rsc-precision-inner">
              <span class="rsc-precision-value">${precision}%</span>
            </div>
          </div>
          <div class="rsc-title">Study Precision</div>
          <div class="rsc-precision-label ${precInfo.cls}">${precInfo.label}</div>
          <div class="rsc-details" style="margin-top: 4px;">
            <div class="rsc-detail-row">
              <span class="rsc-detail-label">Done</span>
              <span class="rsc-detail-value">${totalCompleted}/${totalPlanned}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    `;
  }

  /* ══════════════════════════════
     PIE CHART
     ══════════════════════════════ */

  function renderPieChart(canvasId, data, existingChart) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();

    if (existingChart) {
      existingChart.destroy();
    }

    if (typeof Chart === "undefined") {
      drawCanvasMessage(canvas, "Charts unavailable");
      return null;
    }

    const chartData = [
      data.homework.completed,
      data.revision.completed,
      data.goals.completed,
    ];
    const total = chartData.reduce((a, b) => a + b, 0);

    if (total === 0) {
      // Show empty state on canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCanvasMessage(canvas, "No completed tasks yet");
      return null;
    }

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Homework", "Revision", "Goals"],
        datasets: [{
          data: chartData,
          backgroundColor: [colors.homework, colors.revision, colors.goals],
          borderColor: "transparent",
          borderWidth: 0,
          hoverOffset: 12,
          borderRadius: 6,
          spacing: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: colors.textColor,
              font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: 700 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${context.label}: ${value} (${pct}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 800,
          easing: "easeOutQuart",
        },
      },
    });
  }

  /* ══════════════════════════════
     PERFORMANCE GRAPH
     ══════════════════════════════ */

  function renderPerformanceChart(canvasId, data, labels, existingChart) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();

    if (existingChart) {
      existingChart.destroy();
    }

    if (typeof Chart === "undefined") {
      drawCanvasMessage(canvas, "Charts unavailable");
      return null;
    }

    // Build daily study hours and precision from breakdown
    const studyHoursData = [];
    const precisionData = [];

    labels.forEach((label, i) => {
      const entry = data.dailyBreakdown[i];
      if (entry) {
        studyHoursData.push(entry.studyHours || 0);
        const completed = (entry.homework?.completed || 0) + (entry.revision?.completed || 0) + (entry.goals?.completed || 0);
        const total = (entry.homework?.total || 0) + (entry.revision?.total || 0) + (entry.goals?.total || 0);
        precisionData.push(calculatePrecision(completed, total));
      } else {
        studyHoursData.push(0);
        precisionData.push(0);
      }
    });

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Study Hours",
            type: "bar",
            data: studyHoursData,
            backgroundColor: colors.barBg,
            borderColor: colors.barBorder,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Precision %",
            type: "line",
            data: precisionData,
            borderColor: colors.precisionLine,
            backgroundColor: "transparent",
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: colors.precisionLine,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            yAxisID: "y1",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: colors.textColor,
              font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: 700 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function (context) {
                if (context.dataset.label === "Study Hours") {
                  return ` Study: ${context.parsed.y.toFixed(1)}h`;
                }
                return ` Precision: ${context.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: { color: colors.textColor, font: { family: "'Space Grotesk', sans-serif", size: 11, weight: 600 } },
          },
          y: {
            position: "left",
            title: { display: true, text: "Hours", color: colors.textColor, font: { family: "'Space Grotesk', sans-serif", size: 11, weight: 600 } },
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: { color: colors.textColor, font: { family: "'Space Grotesk', sans-serif", size: 11 } },
            beginAtZero: true,
          },
          y1: {
            position: "right",
            title: { display: true, text: "Precision %", color: colors.textColor, font: { family: "'Space Grotesk', sans-serif", size: 11, weight: 600 } },
            grid: { drawOnChartArea: false },
            ticks: { color: colors.textColor, font: { family: "'Space Grotesk', sans-serif", size: 11 } },
            beginAtZero: true,
            max: 100,
          },
        },
        animation: {
          duration: 800,
          easing: "easeOutQuart",
        },
      },
    });
  }

  function drawCanvasMessage(canvas, message) {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width || canvas.width || 300));
    const height = Math.max(1, Math.round(rect.height || canvas.height || 180));

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = document.documentElement.getAttribute("data-theme") === "dark" ? "#94a3b8" : "#64748b";
    ctx.font = "600 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, height / 2);
  }

  /* ══════════════════════════════
     COMPARISON CARD (Weekly only)
     ══════════════════════════════ */

  function buildComparisonHTML(current, previous) {
    function cmpRow(label, curVal, prevVal, suffix = "", isFloat = false) {
      const diff = curVal - prevVal;
      const pctDiff = prevVal > 0 ? Math.round(Math.abs(diff) / prevVal * 100) : (diff > 0 ? 100 : 0);
      const isUp = diff > 0;
      const isSame = diff === 0;
      const cls = isSame ? "cmp-same" : isUp ? "cmp-up" : "cmp-down";
      const arrow = isSame ? "→" : isUp ? "↑" : "↓";
      const diffDisplay = isFloat ? Math.abs(diff).toFixed(1) : Math.abs(diff);
      const sign = isSame ? "" : isUp ? "+" : "-";

      return `
        <div class="cmp-row ${cls}">
          <span class="cmp-label">${label}</span>
          <div class="cmp-values">
            <span class="cmp-diff">${sign}${diffDisplay}${suffix}</span>
            <span class="cmp-arrow">${arrow}</span>
            <span class="cmp-pct">${pctDiff}%</span>
          </div>
        </div>
      `;
    }

    // Overall summary
    const totalDiff = current.studyHours - previous.studyHours;
    const pctDiff = previous.studyHours > 0 ? Math.round(Math.abs(totalDiff) / previous.studyHours * 100) : (totalDiff > 0 ? 100 : 0);
    const isUp = totalDiff > 0;
    const isSame = Math.abs(totalDiff) < 0.1;
    const summaryClass = isSame ? "cmp-summary-same" : isUp ? "cmp-summary-up" : "cmp-summary-down";
    const summaryArrow = isSame ? "→" : isUp ? "↑" : "↓";
    const summaryText = isSame
      ? "About the same as last week"
      : isUp
        ? `Studied ${pctDiff}% more than last week`
        : `Studied ${pctDiff}% less than last week`;

    // Current vs previous precision
    const curCompleted = current.homework.completed + current.revision.completed + current.goals.completed;
    const curTotal = current.homework.assigned + current.revision.scheduled + current.goals.created;
    const prevCompleted = previous.homework.completed + previous.revision.completed + previous.goals.completed;
    const prevTotal = previous.homework.assigned + previous.revision.scheduled + previous.goals.created;
    const curPrecision = calculatePrecision(curCompleted, curTotal);
    const prevPrecision = calculatePrecision(prevCompleted, prevTotal);

    return `
      <div class="report-comparison-card card">
        <div class="card-hd">
          <div class="card-title">
            <div class="icon">📈</div>
            Weekly Comparison
          </div>
          <span class="card-tag">vs Last Week</span>
        </div>
        <div class="cmp-summary ${summaryClass}">
          <span class="cmp-summary-arrow">${summaryArrow}</span>
          <span class="cmp-summary-text">${summaryText}</span>
        </div>
        <div class="cmp-grid">
          ${cmpRow("Study Time", current.studyHours, previous.studyHours, "h", true)}
          ${cmpRow("Homework", current.homework.completed, previous.homework.completed)}
          ${cmpRow("Revision", current.revision.completed, previous.revision.completed)}
          ${cmpRow("Goals", current.goals.completed, previous.goals.completed)}
          ${cmpRow("Precision", curPrecision, prevPrecision, "%")}
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════
     WEEKLY REPORT RENDER
     ══════════════════════════════ */

  function renderWeeklyReport() {
    const container = document.getElementById("report-weekly-content");
    if (!container) return;

    const data = getWeeklyData(0);
    const prevData = getWeeklyData(-1);

    // Date range label
    const rangeLabel = formatDateShort(data.range.start) + " – " + formatDateShort(data.range.end);

    // Build daily labels and fill missing days
    const filledBreakdown = [];
    const dayLabels = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(data.range.start);
      d.setDate(d.getDate() + i);
      const iso = dateToISO(d);
      dayLabels.push(DAY_NAMES_SHORT[i]);
      const entry = data.dailyBreakdown.find(e => e.date === iso);
      filledBreakdown.push(entry || { date: iso, homework: { completed: 0, total: 0 }, revision: { completed: 0, total: 0 }, goals: { completed: 0, total: 0 }, studyHours: 0, sessions: 0 });
    }
    // Replace breakdown with filled version for chart
    const chartData = { ...data, dailyBreakdown: filledBreakdown };

    container.innerHTML = `
      <div class="report-range-label">${rangeLabel}</div>
      ${buildStatCardsHTML(data, "This Week")}
      <div class="report-charts-section">
        <div class="report-charts-grid">
          <div class="report-chart-card card">
            <div class="card-hd">
              <div class="card-title">
                <div class="icon">🍩</div>
                Completion Breakdown
              </div>
            </div>
            <div class="report-chart-wrap report-pie-wrap">
              <canvas id="weekly-pie-chart"></canvas>
            </div>
          </div>
          <div class="report-chart-card card">
            <div class="card-hd">
              <div class="card-title">
                <div class="icon">📊</div>
                Daily Performance
              </div>
            </div>
            <div class="report-chart-wrap report-perf-wrap">
              <canvas id="weekly-perf-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
      ${buildComparisonHTML(data, prevData)}
    `;

    // Render charts after DOM update
    requestAnimationFrame(() => {
      weeklyPieChart = renderPieChart("weekly-pie-chart", data, weeklyPieChart);
      weeklyPerfChart = renderPerformanceChart("weekly-perf-chart", chartData, dayLabels, weeklyPerfChart);
      if (window.addHoverListeners) window.addHoverListeners();
    });
  }

  /* ══════════════════════════════
     MONTHLY REPORT RENDER
     ══════════════════════════════ */

  function renderMonthlyReport() {
    const container = document.getElementById("report-monthly-content");
    if (!container) return;

    const data = getMonthlyData();
    const monthName = MONTH_NAMES[data.range.start.getMonth()] + " " + data.range.start.getFullYear();

    // Build daily labels: show date numbers, fill gaps
    const daysInMonth = data.range.end.getDate();
    const filledBreakdown = [];
    const dayLabels = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(data.range.start.getFullYear(), data.range.start.getMonth(), i);
      const iso = dateToISO(d);
      dayLabels.push(String(i));
      const entry = data.dailyBreakdown.find(e => e.date === iso);
      filledBreakdown.push(entry || { date: iso, homework: { completed: 0, total: 0 }, revision: { completed: 0, total: 0 }, goals: { completed: 0, total: 0 }, studyHours: 0, sessions: 0 });
    }
    const chartData = { ...data, dailyBreakdown: filledBreakdown };

    container.innerHTML = `
      <div class="report-range-label">${monthName}</div>
      ${buildStatCardsHTML(data, "This Month")}
      <div class="report-charts-section">
        <div class="report-charts-grid">
          <div class="report-chart-card card">
            <div class="card-hd">
              <div class="card-title">
                <div class="icon">🍩</div>
                Completion Breakdown
              </div>
            </div>
            <div class="report-chart-wrap report-pie-wrap">
              <canvas id="monthly-pie-chart"></canvas>
            </div>
          </div>
          <div class="report-chart-card card">
            <div class="card-hd">
              <div class="card-title">
                <div class="icon">📊</div>
                Daily Performance
              </div>
            </div>
            <div class="report-chart-wrap report-perf-wrap">
              <canvas id="monthly-perf-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render charts after DOM update
    requestAnimationFrame(() => {
      monthlyPieChart = renderPieChart("monthly-pie-chart", data, monthlyPieChart);
      monthlyPerfChart = renderPerformanceChart("monthly-perf-chart", chartData, dayLabels, monthlyPerfChart);
      if (window.addHoverListeners) window.addHoverListeners();
    });
  }

  /* ══════════════════════════════
     REFRESH ON DATA CHANGE
     ══════════════════════════════ */

  let refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (activeReportTab === "weekly") renderWeeklyReport();
      else renderMonthlyReport();
    }, 300); // debounce
  }

  /* ══════════════════════════════
     INIT
     ══════════════════════════════ */

  function initReports() {
    // Hook into data changes
    if (typeof onReportDataChanged === "function") {
      onReportDataChanged(scheduleRefresh);
    }

    // Watch for dark mode toggle to re-render charts with correct colors
    const observer = new MutationObserver(() => {
      scheduleRefresh();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Init tab indicator
    initReportTabIndicator();
    window.addEventListener("resize", initReportTabIndicator, { passive: true });

    // Render initial report
    renderWeeklyReport();
  }

  // Wait for both DOM and script.js to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReports);
  } else {
    // script.js loads before us via <script> order, so DOM and state are ready
    requestAnimationFrame(initReports);
  }
})();
