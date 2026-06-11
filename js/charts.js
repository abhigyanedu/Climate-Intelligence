/**
 * EcoMind — Charts Module
 * ========================
 * All Chart.js visualizations.
 */

const Charts = (() => {
  const instances = {};

  const CATEGORY_COLORS = {
    transport:       "#3b82f6",
    transport_cab:   "#3b82f6",
    transport_train: "#22c55e",
    food_delivery:   "#ff6b6b",
    quick_commerce:  "#ff9f40",
    ecommerce:       "#a855f7",
    electricity:     "#f59e0b",
    flight:          "#ef4444",
    accommodation:   "#8b5cf6",
    digital:         "#06b6d4",
    manual:          "#94a3b8",
    travel:          "#06b6d4",
  };

  const CATEGORY_LABELS = {
    transport_cab:   "Cab / Ride",
    transport_train: "Train",
    food_delivery:   "Food Delivery",
    quick_commerce:  "Quick Commerce",
    ecommerce:       "Shopping",
    electricity:     "Electricity",
    flight:          "Flights",
    accommodation:   "Hotels",
    digital:         "Digital",
    manual:          "Other",
    travel:          "Travel",
  };

  function _destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  /**
   * Draw EcoScore ring (doughnut).
   * @param {string} canvasId
   * @param {number} score - 0 to 1000
   */
  function drawScoreRing(canvasId, score) {
    _destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const pct = score / 1000;
    const { color } = CarbonEngine.getScoreLabel(score);

    instances[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [pct, 1 - pct],
          backgroundColor: [color, "rgba(255,255,255,0.05)"],
          borderWidth: 0,
          hoverOffset: 0,
        }],
      },
      options: {
        responsive: true,
        cutout: "78%",
        animation: { animateRotate: true, duration: 1200, easing: "easeOutQuart" },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
  }

  /**
   * Draw weekly bar chart (7 days).
   * @param {string} canvasId
   * @param {Array<{date, label, co2}>} data
   */
  function drawWeeklyChart(canvasId, data) {
    _destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.co2);
    const today = new Date().toISOString().slice(0, 10);

    instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "kg CO₂",
          data: values,
          backgroundColor: data.map((d) =>
            d.date === today ? "#00ff87" : "rgba(0,255,135,0.3)"
          ),
          borderColor: data.map((d) =>
            d.date === today ? "#00ff87" : "rgba(0,255,135,0.5)"
          ),
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        animation: { duration: 900, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(10,14,26,0.95)",
            titleColor: "#e8eaf6",
            bodyColor: "#00ff87",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} kg CO₂e`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#8892b0" },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#8892b0", callback: (v) => v + " kg" },
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Draw category breakdown doughnut.
   * @param {string} canvasId
   * @param {Object} byCategory - { category: co2_kg }
   */
  function drawCategoryChart(canvasId, byCategory) {
    _destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const entries = Object.entries(byCategory).filter(([, v]) => v > 0);
    if (!entries.length) return;

    instances[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: entries.map(([k]) => CATEGORY_LABELS[k] || k),
        datasets: [{
          data: entries.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: entries.map(([k]) => CATEGORY_COLORS[k] || "#94a3b8"),
          borderColor: "rgba(10,14,26,0.8)",
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        cutout: "60%",
        animation: { animateRotate: true, duration: 1000, easing: "easeOutQuart" },
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: { color: "#8892b0", font: { size: 11 }, padding: 12, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: "rgba(10,14,26,0.95)",
            titleColor: "#e8eaf6",
            bodyColor: "#00ff87",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.toFixed(2)} kg CO₂e (${((ctx.parsed / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`,
            },
          },
        },
      },
    });
  }

  /**
   * Draw route comparison horizontal bar chart.
   * @param {string} canvasId
   * @param {Array<{label, icon, co2}>} modes - sorted by co2 asc
   * @param {string} selectedMode
   */
  function drawRouteChart(canvasId, modes, selectedMode) {
    _destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    // Show top 8 most relevant modes
    const displayed = modes.slice(0, 8);

    instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: displayed.map((m) => `${m.icon} ${m.label}`),
        datasets: [{
          label: "kg CO₂e",
          data: displayed.map((m) => m.co2),
          backgroundColor: displayed.map((m) =>
            m.mode === selectedMode ? "#00ff87" : "rgba(0,255,135,0.25)"
          ),
          borderColor: displayed.map((m) =>
            m.mode === selectedMode ? "#00ff87" : "rgba(0,255,135,0.4)"
          ),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(10,14,26,0.95)",
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.x.toFixed(3)} kg CO₂e`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#8892b0", callback: (v) => v + " kg" },
            beginAtZero: true,
          },
          y: { grid: { display: false }, ticks: { color: "#e8eaf6", font: { size: 11 } } },
        },
      },
    });
  }

  return { drawScoreRing, drawWeeklyChart, drawCategoryChart, drawRouteChart, CATEGORY_COLORS, CATEGORY_LABELS };
})();

window.Charts = Charts;
