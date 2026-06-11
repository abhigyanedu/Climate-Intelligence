/**
 * EcoMind — Main App Controller
 * ================================
 * Bootstraps the app, manages navigation, and coordinates all modules.
 */

const App = (() => {
  let _currentPage = "dashboard";
  let _user = null;
  let _insightLoading = false;

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────
  function init() {
    // Seed demo data if first launch
    _seedDemoDataIfNeeded();

    // Init auth
    Auth.init(_onSignIn);

    // Setup navigation
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.nav));
    });

    // Setup sign-in buttons
    document.querySelectorAll(".btn-signin").forEach((btn) => {
      btn.addEventListener("click", () => Auth.signIn());
    });

    // Sign out
    document.getElementById("btn-signout")?.addEventListener("click", () => {
      Auth.signOut();
      localStorage.removeItem("gemini_api_key");
      localStorage.removeItem("maps_api_key");
      _showScreen("auth");
      // Reshow API key modal for next login
      document.getElementById("api-key-modal")?.classList.remove("hidden");
    });

    // Demo mode entry
    document.getElementById("btn-demo")?.addEventListener("click", () => {
      Auth.signIn(); // Will use demo mode if config says so or no config
    });

    // Listen for sign-out event
    window.addEventListener("ecomind:signout", () => _showScreen("auth"));

    // Wire back buttons
    document.querySelectorAll(".btn-back").forEach((btn) => {
      btn.addEventListener("click", () => navigate("dashboard"));
    });

    // Wire up all interactive elements
    _wireLogActivity();
    _wireSnapScan();
    _wireRoutePlanner();
    _wireSettings();

    // Check if already signed in (unlikely for token-based, but check storage)
    const settings = Storage.getSettings();
    if (settings.wasLoggedIn) {
      // Re-auth silently in a real app — for demo just redirect
      Auth.signIn();
    } else {
      _showScreen("auth");
    }

    // Update streak
    Storage.updateStreak();

    // Check API Keys (BYOK logic)
    _checkApiKeys();
  }

  function _checkApiKeys() {
    const geminiKey = localStorage.getItem("gemini_api_key");
    const mapsKey = localStorage.getItem("maps_api_key");

    if (geminiKey && window.ECOMIND_CONFIG) {
      window.ECOMIND_CONFIG.GEMINI_API_KEY = geminiKey;
      window.ECOMIND_CONFIG.MAPS_API_KEY = mapsKey;
      window.ECOMIND_CONFIG.DEMO_MODE = false;
    }

    if (!geminiKey && !window.ECOMIND_CONFIG?.DEMO_MODE) {
      document.getElementById("api-key-modal")?.classList.remove("hidden");
    }

    // Wire up the API Keys form
    document.getElementById("form-api-keys")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const gemini = document.getElementById("input-gemini-key").value;
      const maps = document.getElementById("input-maps-key").value;

      if (gemini) localStorage.setItem("gemini_api_key", gemini);
      if (maps) localStorage.setItem("maps_api_key", maps);

      document.getElementById("api-key-modal")?.classList.add("hidden");
      _showToast("API Keys saved securely to browser.");

      // Update config object in memory so current session uses them
      if (window.ECOMIND_CONFIG) {
        window.ECOMIND_CONFIG.GEMINI_API_KEY = gemini;
        window.ECOMIND_CONFIG.MAPS_API_KEY = maps;
        window.ECOMIND_CONFIG.DEMO_MODE = false;
      }
    });

    // Wire up demo mode button in modal
    document.getElementById("btn-demo-mode-modal")?.addEventListener("click", () => {
      document.getElementById("api-key-modal")?.classList.add("hidden");
      if (window.ECOMIND_CONFIG) {
        window.ECOMIND_CONFIG.DEMO_MODE = true;
      }
      _showToast("Demo Mode activated.");
    });
  }

  function _onSignIn(user) {
    _user = user;
    const settings = Storage.getSettings();
    _updateUserUI(user);

    if (!settings.wasLoggedIn) {
      _showScreen("onboarding");
      _startOnboarding();
    } else {
      _showScreen("app");
      navigate("dashboard");
      setTimeout(() => _loadInsight(), 1000);
    }
  }

  function _startOnboarding() {
    const s1 = document.getElementById("onboarding-step-1");
    const s2 = document.getElementById("onboarding-step-2");
    const s3 = document.getElementById("onboarding-step-3");

    const regionSelect = document.getElementById("onboard-region-select");
    if (regionSelect && regionSelect.children.length === 0) {
      Object.entries(CarbonEngine.GRID_FACTORS).forEach(([code, { name }]) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${name} (${code})`;
        regionSelect.appendChild(opt);
      });
      regionSelect.value = "IN";
    }

    document.getElementById("btn-onboard-next-1")?.addEventListener("click", () => {
      const key = document.getElementById("onboard-gemini-key")?.value;
      if (key) {
        localStorage.setItem("gemini_api_key", key);
        if (window.ECOMIND_CONFIG) {
          window.ECOMIND_CONFIG.GEMINI_API_KEY = key;
          window.ECOMIND_CONFIG.DEMO_MODE = false;
        }
      }
      s1.classList.add("hidden");
      s2.classList.remove("hidden");
    });

    document.getElementById("btn-onboard-next-2")?.addEventListener("click", () => {
      const region = regionSelect?.value || "IN";
      Storage.saveSettings({ region });
      CarbonEngine.setRegion(region);
      s2.classList.add("hidden");
      s3.classList.remove("hidden");
    });

    const finishOnboarding = () => {
      Storage.saveSettings({ wasLoggedIn: true });
      _showScreen("app");
      navigate("dashboard");
      setTimeout(() => _loadInsight(), 1000);
    };

    document.getElementById("btn-onboard-sync")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-onboard-sync");
      btn.textContent = "Syncing...";
      btn.disabled = true;
      try {
        await _doGmailSync();
      } catch (e) {
        console.warn("Initial sync failed", e);
      }
      finishOnboarding();
    });

    document.getElementById("btn-onboard-skip")?.addEventListener("click", finishOnboarding);
  }

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────
  function navigate(page) {
    _currentPage = page;

    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll("[data-nav]").forEach((b) => b.classList.remove("active"));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add("active");

    const navBtn = document.querySelector(`[data-nav="${page}"]`);
    if (navBtn) navBtn.classList.add("active");

    // Page-specific initialization
    switch (page) {
      case "dashboard":
        _renderDashboard();
        break;
      case "email-sync":
        _renderEmailSync();
        break;
      case "route":
        _renderRoute();
        break;
      case "log":
        _renderLog();
        break;
      case "goals":
        _renderGoals();
        break;
    }

    // Refresh icons after render
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }

  function _showScreen(screen) {
    document.getElementById("screen-auth")?.classList.toggle("hidden", screen !== "auth");
    document
      .getElementById("screen-onboarding")
      ?.classList.toggle("hidden", screen !== "onboarding");
    document.getElementById("screen-app")?.classList.toggle("hidden", screen !== "app");
  }

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────
  function _renderDashboard() {
    const settings = Storage.getSettings();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const monthlySummary = Storage.summarize({ from: monthStart, to: today });
    const weeklyData = Storage.getLast7Days();
    const score = CarbonEngine.computeEcoScore(monthlySummary.total);
    const scoreInfo = CarbonEngine.getScoreLabel(score);

    // Update score display
    document.getElementById("eco-score-value").textContent = score;
    document.getElementById("eco-score-label").textContent = scoreInfo.label;
    document.getElementById("eco-score-label").style.color = scoreInfo.color;
    document.getElementById("eco-score-value").style.color = scoreInfo.color;

    // Monthly total
    document.getElementById("monthly-co2").textContent = monthlySummary.total.toFixed(1) + " kg";

    // Streak
    document.getElementById("streak-days").textContent = settings.streakDays || 1;

    // Entries count
    document.getElementById("entries-count").textContent = monthlySummary.count;

    // Category pills
    _renderCategoryPills(monthlySummary.byCategory);

    // Charts
    requestAnimationFrame(() => {
      Charts.drawScoreRing("chart-score-ring", score);
      Charts.drawWeeklyChart("chart-weekly", weeklyData);
      Charts.drawCategoryChart("chart-category", monthlySummary.byCategory);
    });

    // Progress to goal
    const goal = settings.monthlyGoal || 100;
    const pct = Math.min(100, (monthlySummary.total / goal) * 100);
    const goalBar = document.getElementById("goal-progress-bar");
    const goalText = document.getElementById("goal-progress-text");
    if (goalBar) goalBar.style.width = pct + "%";
    if (goalText)
      goalText.textContent = `${monthlySummary.total.toFixed(1)} / ${goal} kg CO₂ monthly goal`;
    if (goalBar) goalBar.style.background = pct > 80 ? "#ff6b6b" : pct > 50 ? "#ff9f40" : "#00ff87";
  }

  function _renderCategoryPills(byCategory) {
    const container = document.getElementById("category-pills");
    if (!container) return;

    const sorted = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    container.innerHTML = sorted
      .map(([cat, co2]) => {
        const color = Charts.CATEGORY_COLORS[cat] || "#94a3b8";
        const label = Charts.CATEGORY_LABELS[cat] || cat;
        return `
        <div class="category-pill" style="border-color:${color}22; background:${color}11;">
          <span class="pill-dot" style="background:${color}"></span>
          <span class="pill-label">${label}</span>
          <span class="pill-value" style="color:${color}">${co2.toFixed(1)} kg</span>
        </div>`;
      })
      .join("");
  }

  async function _loadInsight() {
    if (_insightLoading) return;
    _insightLoading = true;

    const insightEl = document.getElementById("ai-insight-text");
    if (!insightEl) return;

    insightEl.textContent = "Analyzing your footprint…";
    insightEl.classList.add("loading");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

      const thisWeek = Storage.summarize({ from: weekAgo, to: today });
      const lastWeek = Storage.summarize({ from: twoWeeksAgo, to: weekAgo });

      const topCategory =
        Object.entries(thisWeek.byCategory).sort(([, a], [, b]) => b - a)[0]?.[0] || "general";

      const insight = await GeminiClient.generateWeeklyInsight({
        summary: thisWeek,
        lastWeek: lastWeek.total,
        topCategory,
        userName: _user?.name?.split(" ")[0] || "there",
      });

      insightEl.textContent = insight;
      insightEl.classList.remove("loading");
    } catch {
      insightEl.textContent = "Connect your Gmail or log activities to get personalized insights.";
      insightEl.classList.remove("loading");
    }
    _insightLoading = false;
  }

  // ─────────────────────────────────────────────────────────────
  // EMAIL SYNC
  // ─────────────────────────────────────────────────────────────
  function _renderEmailSync() {
    const list = document.getElementById("email-sync-list");
    if (!list) return;

    const settings = Storage.getSettings();
    if (!settings.gmailSynced) {
      list.innerHTML = `<div class="sync-empty">
        <div class="sync-empty-icon">📧</div>
        <p>Connect Gmail to automatically detect your carbon footprint from orders, flights, and bills.</p>
        <button class="btn-primary" id="btn-sync-gmail">🔄 Sync Gmail Now</button>
      </div>`;
      document.getElementById("btn-sync-gmail")?.addEventListener("click", _doGmailSync);
    }
  }

  async function _doGmailSync() {
    const list = document.getElementById("email-sync-list");
    const settings = Storage.getSettings();
    list.innerHTML = `<div class="sync-loading"><div class="spinner"></div><p>Scanning your emails…</p></div>`;

    try {
      const token = Auth.getAccessToken();
      const results = await GmailParser.sync(token, settings.isGlobalMode);

      if (!results.length) {
        list.innerHTML = `<p class="sync-empty-msg">No carbon-related emails found in the last 30 days.</p>`;
        return;
      }

      Storage.saveSettings({ gmailSynced: true });

      list.innerHTML = results
        .map(
          (r) => `
        <div class="email-item" data-id="${r.id}" data-co2="${r.estimatedCo2 || 0}" data-category="${r.category}">
          <div class="email-icon"><i data-lucide="${r.categoryIcon}"></i></div>
          <div class="email-body">
            <div class="email-platform">${r.platform}</div>
            <div class="email-subject">${r.subject}</div>
            <div class="email-date">${r.date}</div>
          </div>
          <div class="email-co2 ${r.needsReview ? "needs-review" : ""}">
            ${r.estimatedCo2 ? `<span>${r.estimatedCo2.toFixed(1)}</span><small>kg CO₂</small>` : `<span class="review-badge">Review</span>`}
          </div>
          <button class="btn-add-entry" data-item='${JSON.stringify({
            category: r.category,
            source: `Gmail - ${r.platform}`,
            co2: r.estimatedCo2 || 0,
            date: r.date,
            details: { subject: r.subject, platform: r.platform },
          })}' aria-label="Add ${r.platform} entry"><i data-lucide="plus"></i></button>
        </div>
      `
        )
        .join("");

      // Wire add buttons
      document.querySelectorAll(".btn-add-entry").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const item = JSON.parse(e.currentTarget.dataset.item);
          Storage.addEntry(item);
          e.currentTarget.textContent = "✓";
          e.currentTarget.disabled = true;
          e.currentTarget.classList.add("added");
          _showToast(`Added ${item.source} — ${item.co2} kg CO₂`);
        });
      });

      // Add all button
      const addAllBtn = document.getElementById("btn-add-all-emails");
      if (addAllBtn) {
        addAllBtn.classList.remove("hidden");
        addAllBtn.addEventListener("click", () => {
          results
            .filter((r) => r.estimatedCo2)
            .forEach((r) => {
              Storage.addEntry({
                category: r.category,
                source: `Gmail - ${r.platform}`,
                co2: r.estimatedCo2,
                date: r.date,
                details: { subject: r.subject, platform: r.platform },
              });
            });
          _showToast(`Added ${results.filter((r) => r.estimatedCo2).length} entries from Gmail`);
          navigate("dashboard");
        });
      }
    } catch (e) {
      list.innerHTML = `<div class="sync-error">❌ Sync failed: ${e.message}</div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOG ACTIVITY
  // ─────────────────────────────────────────────────────────────
  function _renderLog() {
    // Render recent log entries
    const entries = Storage.getEntries().slice(-20).reverse();
    const logList = document.getElementById("log-entries");
    if (!logList) return;

    if (!entries.length) {
      logList.innerHTML = `<div class="log-empty">No entries yet. Add your first activity!</div>`;
      return;
    }

    logList.innerHTML = entries
      .map((e) => {
        const color = Charts.CATEGORY_COLORS[e.category] || "#94a3b8";
        const icon = _getCategoryIcon(e.category);
        return `
        <div class="log-entry">
          <div class="log-entry-icon" style="background:${color}22; color:${color}"><i data-lucide="${icon}"></i></div>
          <div class="log-entry-body">
            <div class="log-entry-source">${e.source}</div>
            <div class="log-entry-date">${e.date}</div>
          </div>
          <div class="log-entry-co2" style="color:${color}">${e.co2.toFixed(2)} kg</div>
          <button class="btn-delete-entry" data-id="${e.id}" aria-label="Delete entry"><i data-lucide="trash-2"></i></button>
        </div>`;
      })
      .join("");

    document.querySelectorAll(".btn-delete-entry").forEach((btn) => {
      btn.addEventListener("click", () => {
        Storage.deleteEntry(btn.dataset.id);
        _renderLog();
        _showToast("Entry deleted");
      });
    });
  }

  function _wireLogActivity() {
    // Transport form
    document.getElementById("form-transport")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const mode = document.getElementById("transport-mode").value;
      const dist = parseFloat(document.getElementById("transport-dist").value);
      if (isNaN(dist) || dist <= 0 || dist > 100000) {
        _showToast("Please enter a valid distance.");
        return;
      }

      const co2 = CarbonEngine.calcTransport(mode, dist);
      Storage.addEntry({ category: "transport_cab", source: `Manual - ${mode}`, co2 });
      _showToast(`Logged ${co2.toFixed(2)} kg CO₂ for ${dist}km trip`);
      navigate("dashboard");
    });

    // Food/delivery form
    document.getElementById("form-food")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const foodType = document.getElementById("food-type").value;
      const isQC = document.getElementById("food-isqc").checked;
      const result = CarbonEngine.calcFoodDelivery(foodType, isQC);
      Storage.addEntry({
        category: isQC ? "quick_commerce" : "food_delivery",
        source: `Manual - Food Delivery`,
        co2: result.total,
      });
      _showToast(`Logged ${result.total.toFixed(2)} kg CO₂ for food delivery`);
      navigate("dashboard");
    });

    // Appliance form
    document.getElementById("form-appliance")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const appliance = document.getElementById("appliance-type").value;
      const hours = parseFloat(document.getElementById("appliance-hours").value);
      const days = parseFloat(document.getElementById("appliance-days").value) || 1;

      if (isNaN(hours) || hours <= 0 || hours > 24 || isNaN(days) || days <= 0 || days > 365) {
        _showToast("Please enter valid hours (1-24) and days (1-365).");
        return;
      }

      const co2 = CarbonEngine.calcAppliance(appliance, hours, days);
      Storage.addEntry({ category: "electricity", source: `Manual - ${appliance}`, co2 });
      _showToast(`Logged ${co2.toFixed(2)} kg CO₂`);
      navigate("dashboard");
    });

    // Digital form
    document.getElementById("form-digital")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const activity = document.getElementById("digital-activity").value;
      const hours = parseFloat(document.getElementById("digital-hours").value);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        _showToast("Please enter a valid number of hours.");
        return;
      }
      const co2 = CarbonEngine.calcDigital(activity, hours);
      Storage.addEntry({ category: "digital", source: `Manual - Digital`, co2 });
      _showToast(`Logged ${co2.toFixed(4)} kg CO₂ for ${hours}h of ${activity}`);
      navigate("dashboard");
    });

    // Flight form
    document.getElementById("form-flight")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const dist = parseFloat(document.getElementById("flight-distance").value);
      const cls = document.getElementById("flight-class").value;

      if (isNaN(dist) || dist <= 0 || dist > 20000) {
        _showToast("Please enter a valid flight distance.");
        return;
      }

      const co2 = CarbonEngine.calcFlight(dist, cls);
      Storage.addEntry({
        category: "flight",
        source: `Manual - Flight`,
        co2,
        details: { distanceKm: dist, class: cls },
      });
      _showToast(`Logged ${co2.toFixed(1)} kg CO₂ for flight`);
      navigate("dashboard");
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SNAP & SCAN
  // ─────────────────────────────────────────────────────────────
  function _wireSnapScan() {
    const fileInput = document.getElementById("scan-file-input");
    const dropZone = document.getElementById("scan-dropzone");

    // Drop zone
    dropZone?.addEventListener("click", () => fileInput?.click());
    dropZone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) _processScanFile(file);
    });

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) _processScanFile(file);
    });

    // Scan type toggle
    document.querySelectorAll(".scan-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".scan-type-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const type = btn.dataset.scanType;
        document.getElementById("scan-hint").textContent =
          type === "bill"
            ? "Upload your monthly electricity bill image"
            : "Snap a photo of your shopping receipt";
      });
    });
  }

  async function _processScanFile(file) {
    const resultEl = document.getElementById("scan-result");
    const loadingEl = document.getElementById("scan-loading");
    const scanType = document.querySelector(".scan-type-btn.active")?.dataset.scanType || "receipt";

    if (!resultEl || !loadingEl) return;

    // EDGE CASE: File validation
    if (!file.type.startsWith("image/")) {
      _showToast("Please upload a valid image file (JPG/PNG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      _showToast("File is too large. Please upload an image under 5MB.");
      return;
    }

    loadingEl.classList.remove("hidden");
    resultEl.innerHTML = "";

    try {
      if (scanType === "bill") {
        const bill = await GeminiClient.analyzeElectricityBill(file);
        if (bill?.kWh) {
          const settings = Storage.getSettings();
          const co2 = CarbonEngine.calcElectricity(bill.kWh, settings.region);
          resultEl.innerHTML = _renderBillResult(bill, co2);

          document.getElementById("btn-confirm-bill")?.addEventListener("click", () => {
            Storage.addEntry({
              category: "electricity",
              source: `Bill - ${bill.provider || "Electricity"}`,
              co2,
              date: bill.period_end || new Date().toISOString().slice(0, 10),
              details: bill,
            });
            _showToast(`Added ${co2.toFixed(1)} kg CO₂ from electricity bill`);
            navigate("dashboard");
          });
        } else {
          resultEl.innerHTML = `<div class="scan-error">Could not extract kWh from bill. Please ensure the image is clear.</div>`;
        }
      } else {
        const receipt = await GeminiClient.analyzeReceipt(file);
        if (receipt?.items?.length) {
          const co2 = _estimateReceiptCO2(receipt.items);
          resultEl.innerHTML = _renderReceiptResult(receipt, co2);

          document.getElementById("btn-confirm-receipt")?.addEventListener("click", () => {
            Storage.addEntry({
              category: "ecommerce",
              source: `Receipt - ${receipt.vendor || "Shopping"}`,
              co2,
              details: receipt,
            });
            _showToast(`Added ${co2.toFixed(2)} kg CO₂ from receipt`);
            navigate("dashboard");
          });
        } else {
          resultEl.innerHTML = `<div class="scan-error">Could not read receipt. Please try a clearer photo.</div>`;
        }
      }
    } catch (e) {
      resultEl.innerHTML = `<div class="scan-error">Analysis failed: ${e.message}</div>`;
    }
    loadingEl.classList.add("hidden");
  }

  function _estimateReceiptCO2(items) {
    const categoryMap = {
      food_veg: "veg_meal",
      food_nonveg: "chicken_meal",
      dairy: "paneer_meal",
      electronics: "electronics_small",
      clothing: "clothing_fast_fashion",
      grocery: "groceries_packaged",
      book: "books",
      toy: "toys",
      appliance: "home_appliance_small",
      home_goods: "furniture_small",
      beauty: "beauty_cosmetics",
    };
    return items.reduce((sum, item) => {
      const key = categoryMap[item.category] || "groceries_packaged";
      return sum + (CarbonEngine.getCatalogs().shoppingFactors[key] || 2.0) * (item.qty || 1);
    }, 0);
  }

  function _renderBillResult(bill, co2) {
    return `
      <div class="scan-result-card">
        <h3>⚡ Bill Analysis</h3>
        <div class="scan-result-grid">
          <div class="scan-result-item"><span>Provider</span><strong>${bill.provider || "Unknown"}</strong></div>
          <div class="scan-result-item"><span>Units (kWh)</span><strong>${bill.kWh}</strong></div>
          <div class="scan-result-item"><span>Period</span><strong>${bill.period_start || "?"} → ${bill.period_end || "?"}</strong></div>
          <div class="scan-result-item"><span>Amount</span><strong>₹${bill.amount || "?"}</strong></div>
        </div>
        <div class="scan-co2-result">
          <span class="co2-big">${co2.toFixed(1)}</span>
          <span class="co2-unit">kg CO₂e</span>
          <span class="co2-label">this billing period</span>
        </div>
        <button class="btn-primary" id="btn-confirm-bill">✓ Add to My Carbon Log</button>
      </div>`;
  }

  function _renderReceiptResult(receipt, co2) {
    return `
      <div class="scan-result-card">
        <h3>🧾 Receipt Analysis — ${receipt.vendor}</h3>
        <div class="scan-items-list">
          ${receipt.items
            .map(
              (item) => `
            <div class="scan-item">
              <span>${item.name}</span>
              <span class="item-qty">×${item.qty || 1}</span>
              <span class="item-cat">${item.category}</span>
            </div>`
            )
            .join("")}
        </div>
        <div class="scan-co2-result">
          <span class="co2-big">${co2.toFixed(2)}</span>
          <span class="co2-unit">kg CO₂e</span>
          <span class="co2-label">estimated total</span>
        </div>
        <button class="btn-primary" id="btn-confirm-receipt">✓ Add to My Carbon Log</button>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────
  // ROUTE PLANNER
  // ─────────────────────────────────────────────────────────────
  function _renderRoute() {
    MapsCarbon.init();
    const originInput = document.getElementById("route-origin");
    const destInput = document.getElementById("route-dest");
    if (originInput && destInput && window.google?.maps) {
      const settings = Storage.getSettings();
      MapsCarbon.setupAutocomplete(originInput, settings.isGlobalMode ? "GLOBAL" : "IN");
      MapsCarbon.setupAutocomplete(destInput, settings.isGlobalMode ? "GLOBAL" : "IN");
    }
  }

  function _wireRoutePlanner() {
    document.getElementById("form-route")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const origin = document.getElementById("route-origin").value;
      const dest = document.getElementById("route-dest").value;
      const selectedMode = document.getElementById("route-mode").value;

      if (!origin || !dest) return;

      const loadingEl = document.getElementById("route-loading");
      const resultEl = document.getElementById("route-result");
      loadingEl?.classList.remove("hidden");
      resultEl && (resultEl.innerHTML = "");

      try {
        const result = await MapsCarbon.calcRouteCO2(origin, dest);
        loadingEl?.classList.add("hidden");

        const selectedCO2 = CarbonEngine.calcTransport(selectedMode, result.distanceKm);
        const treesSaved = result.getTreeSavings ? result.getTreeSavings(selectedCO2) : 0;

        let savingsHtml = `<div class="route-saving">You save <strong>${result.maxSaving.toFixed(2)} kg CO₂</strong> vs worst option</div>`;
        if (treesSaved > 0) {
          savingsHtml += `<div class="route-saving" style="color: var(--accent); margin-top:0.25rem;">🌳 Equivalent to planting <strong>${treesSaved} trees</strong> (monthly)</div>`;
        }

        resultEl.innerHTML = `
          <div class="route-result-header">
            <div class="route-distance">📍 ${result.distanceKm} km</div>
            ${savingsHtml}
          </div>
          <div class="route-selected">
            Your choice (${selectedMode.replace(/_/g, " ")}): <strong>${selectedCO2.toFixed(3)} kg CO₂e</strong>
          </div>
          <canvas id="chart-route" height="200"></canvas>
          <button class="btn-primary" id="btn-log-route" style="margin-top:1rem">+ Log This Trip</button>`;

        requestAnimationFrame(() => {
          Charts.drawRouteChart("chart-route", result.comparison, selectedMode);
        });

        document.getElementById("btn-log-route")?.addEventListener("click", () => {
          Storage.addEntry({
            category: "transport_cab",
            source: `Route - ${selectedMode}`,
            co2: selectedCO2,
            details: { origin, dest, distanceKm: result.distanceKm, mode: selectedMode },
          });
          _showToast(`Logged ${selectedCO2.toFixed(3)} kg CO₂ for trip`);
          navigate("dashboard");
        });
      } catch (err) {
        loadingEl?.classList.add("hidden");
        resultEl &&
          (resultEl.innerHTML = `<div class="route-error">Could not calculate route: ${err.message}</div>`);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GOALS
  // ─────────────────────────────────────────────────────────────
  async function _renderGoals() {
    const container = document.getElementById("goals-list");
    if (!container) return;

    container.innerHTML = `<div class="goals-loading"><div class="spinner"></div><p>Generating personalized goals…</p></div>`;

    const settings = Storage.getSettings();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";
    const summary = Storage.summarize({ from: monthStart, to: today });

    try {
      const goals = await GeminiClient.generateGoals({ summary, settings });

      container.innerHTML = goals
        .map(
          (g, i) => `
        <div class="goal-card" aria-label="Goal: ${g.title}">
          <div class="goal-header">
            <div class="goal-difficulty goal-${g.difficulty}">${g.difficulty}</div>
            <div class="goal-impact">-${g.target_reduction_kg} kg/mo</div>
          </div>
          <h3 class="goal-title">${g.title}</h3>
          <p class="goal-desc">${g.description}</p>
          <div class="goal-progress">
            <div class="goal-progress-bar" style="width:0%" id="goal-bar-${i}"></div>
          </div>
          <button class="btn-accept-goal" data-idx="${i}" aria-label="Accept goal: ${g.title}">Set This Goal →</button>
        </div>`
        )
        .join("");

      document.querySelectorAll(".btn-accept-goal").forEach((btn) => {
        btn.addEventListener("click", () => {
          btn.textContent = "✓ Goal Set!";
          btn.disabled = true;
          btn.classList.add("accepted");
          _showToast("Goal added! Keep tracking to see your progress.");
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="goals-error">Could not load goals. ${e.message}</div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────
  function _wireSettings() {
    const regionSelect = document.getElementById("settings-region");
    const globalToggle = document.getElementById("settings-global-mode");
    const goalInput = document.getElementById("settings-goal");

    if (regionSelect) {
      // Populate region options
      Object.entries(CarbonEngine.GRID_FACTORS).forEach(([code, { name }]) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${name} (${code})`;
        regionSelect.appendChild(opt);
      });

      const settings = Storage.getSettings();
      regionSelect.value = settings.region || "IN";
      if (goalInput) goalInput.value = settings.monthlyGoal || 100;
      if (globalToggle) globalToggle.checked = settings.isGlobalMode;
    }

    document.getElementById("form-settings")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const region = regionSelect?.value || "IN";
      const goal = parseFloat(goalInput?.value) || 100;
      const isGlobal = globalToggle?.checked || false;

      Storage.saveSettings({ region, monthlyGoal: goal, isGlobalMode: isGlobal });
      CarbonEngine.setRegion(region);
      _showToast("Settings saved ✓");
    });

    document.getElementById("btn-clear-data")?.addEventListener("click", () => {
      if (confirm("Clear all carbon log data? Settings will be kept.")) {
        Storage.remove("log");
        _showToast("Data cleared");
        navigate("dashboard");
      }
    });

    document.getElementById("btn-signout-main")?.addEventListener("click", () => {
      if (
        confirm(
          "Warning: Signing out will completely wipe your local carbon log data from this browser. Are you sure you want to proceed?"
        )
      ) {
        Auth.signOut();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────
  function _updateUserUI(user) {
    const nameEl = document.getElementById("user-name");
    const avatarEl = document.getElementById("user-avatar");

    // Settings profile UI
    const settingsNameEl = document.getElementById("settings-name");
    const settingsEmailEl = document.getElementById("settings-email");
    const settingsAvatarEl = document.getElementById("settings-avatar");

    if (settingsNameEl) settingsNameEl.textContent = user.name || user.email || "EcoMind User";
    if (settingsEmailEl) settingsEmailEl.textContent = user.email || "";

    if (nameEl) nameEl.textContent = user.name || user.email;

    if (user.picture) {
      if (avatarEl) {
        avatarEl.src = user.picture;
        avatarEl.alt = user.name || "User avatar";
      }
      if (settingsAvatarEl) {
        settingsAvatarEl.src = user.picture;
        settingsAvatarEl.style.display = "block";
      }
    } else {
      if (avatarEl) {
        avatarEl.style.display = "none";
        const initials = document.getElementById("user-initials");
        if (initials) initials.textContent = (user.name || "U").charAt(0).toUpperCase();
      }
    }

    if (user.isDemoUser) {
      document.getElementById("demo-badge")?.classList.remove("hidden");
    }
  }

  function _showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function _getCategoryIcon(category) {
    const icons = {
      transport_cab: "car",
      transport_train: "train",
      food_delivery: "pizza",
      quick_commerce: "zap",
      ecommerce: "package",
      electricity: "lightbulb",
      flight: "plane",
      accommodation: "hotel",
      digital: "smartphone",
      manual: "pen-tool",
      travel: "map",
    };
    return icons[category] || "bar-chart-2";
  }

  function _seedDemoDataIfNeeded() {
    const log = Storage.getEntries();
    if (!log.length) {
      const isDemo = window.ECOMIND_CONFIG?.DEMO_MODE || Auth.getUser()?.isDemoUser;
      if (isDemo) {
        _injectDemoData();
      }
    }
  }

  function _injectDemoData() {
    const seed = [
      { category: "food_delivery", source: "Gmail - Zomato", co2: 5.5, daysAgo: 0 },
      { category: "transport_cab", source: "Gmail - Uber", co2: 3.2, daysAgo: 0 },
      { category: "quick_commerce", source: "Gmail - Blinkit", co2: 3.8, daysAgo: 1 },
      { category: "food_delivery", source: "Gmail - Swiggy", co2: 5.5, daysAgo: 1 },
      { category: "electricity", source: "Bill - BESCOM", co2: 172.2, daysAgo: 2 },
      { category: "transport_cab", source: "Gmail - Ola", co2: 2.8, daysAgo: 2 },
      { category: "flight", source: "Gmail - IndiGo", co2: 186, daysAgo: 4 },
      { category: "ecommerce", source: "Gmail - Amazon.in", co2: 9.5, daysAgo: 5 },
      { category: "quick_commerce", source: "Gmail - Zepto", co2: 3.8, daysAgo: 5 },
      { category: "food_delivery", source: "Gmail - Swiggy", co2: 5.5, daysAgo: 6 },
      { category: "transport_cab", source: "Gmail - Uber", co2: 4.1, daysAgo: 7 },
      { category: "ecommerce", source: "Gmail - Flipkart", co2: 12.0, daysAgo: 9 },
      { category: "digital", source: "Manual - Streaming", co2: 0.036, daysAgo: 10 },
      { category: "food_delivery", source: "Gmail - Zomato", co2: 5.5, daysAgo: 12 },
    ];

    seed.forEach(({ category, source, co2, daysAgo }) => {
      const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
      Storage.addEntry({ category, source, co2, date });
    });
  }

  return { init, navigate, doGmailSync: _doGmailSync };
})();

// Boot when DOM is ready
document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;
window._doGmailSync = App.doGmailSync;
