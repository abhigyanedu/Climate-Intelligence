/**
 * EcoMind — Storage Module
 * =========================
 * Unified read/write layer over localStorage.
 * All EcoMind data lives under the 'ecomind_' namespace.
 */

const Storage = (() => {
  const NS = "ecomind_";

  function _key(k) {
    return NS + k;
  }

  /**
   * Save a value (auto-serialized to JSON).
   */
  function set(key, value) {
    try {
      localStorage.setItem(_key(key), JSON.stringify(value));
    } catch (e) {
      console.warn("[Storage] Write failed:", e);
    }
  }

  /**
   * Load a value (auto-deserialized).
   */
  function get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(_key(key));
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Remove a key.
   */
  function remove(key) {
    localStorage.removeItem(_key(key));
  }

  /**
   * Clear all EcoMind data (or a category).
   */
  function clear(category) {
    if (category) {
      remove(category);
      return;
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => localStorage.removeItem(k));
  }

  // ─────────────────────────────────────────────────────────────
  // CARBON LOG HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Add a carbon entry to the log.
   * @param {{ category, source, co2, date, details }} entry
   */
  function addEntry(entry) {
    const log = get("log", []);
    const newEntry = {
      id: Date.now() + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      date: entry.date || new Date().toISOString().slice(0, 10),
      category: entry.category, // transport|food_delivery|quick_commerce|ecommerce|electricity|flight|digital|accommodation|manual
      source: entry.source, // "Gmail - Zomato" | "Manual" | "Gemini Vision" | "Maps" etc.
      co2: parseFloat(entry.co2) || 0,
      details: entry.details || {},
    };
    if (isNaN(newEntry.co2) || newEntry.co2 < 0) newEntry.co2 = 0;
    log.push(newEntry);
    set("log", log);
    return newEntry;
  }

  /**
   * Get all entries, optionally filtered by date range.
   */
  function getEntries({ from, to } = {}) {
    const log = get("log", []);
    if (!from && !to) return log;
    return log.filter((e) => {
      const d = e.date;
      return (!from || d >= from) && (!to || d <= to);
    });
  }

  /**
   * Delete a log entry by ID.
   */
  function deleteEntry(id) {
    const log = get("log", []).filter((e) => e.id !== id);
    set("log", log);
  }

  /**
   * Summarize CO₂ by category for a date range.
   */
  function summarize({ from, to } = {}) {
    const entries = getEntries({ from, to });
    const summary = {};
    let total = 0;
    for (const e of entries) {
      const val = parseFloat(e.co2) || 0;
      summary[e.category] = (summary[e.category] || 0) + val;
      total += val;
    }
    return { byCategory: summary, total: parseFloat(total.toFixed(2)), count: entries.length };
  }

  /**
   * Get 7-day daily totals for chart.
   */
  function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entries = getEntries({ from: dateStr, to: dateStr });
      const total = entries.reduce((sum, e) => sum + e.co2, 0);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en", { weekday: "short" }),
        co2: parseFloat(total.toFixed(2)),
      });
    }
    return days;
  }

  /**
   * Get 4-week totals for monthly trend.
   */
  function getLast4Weeks() {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const to = new Date();
      to.setDate(to.getDate() - w * 7);
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const entries = getEntries({ from: fromStr, to: toStr });
      const total = entries.reduce((sum, e) => sum + e.co2, 0);
      weeks.push({ label: `W${4 - w}`, co2: parseFloat(total.toFixed(2)) });
    }
    return weeks;
  }

  // ─────────────────────────────────────────────────────────────
  // USER SETTINGS
  // ─────────────────────────────────────────────────────────────

  function getSettings() {
    return get("settings", {
      region: "IN",
      isGlobalMode: false,
      includeRFI: true,
      monthlyGoal: 100, // kg CO₂ per month
      streakDays: 0,
      lastActiveDate: null,
      gmailSynced: false,
      theme: "dark",
    });
  }

  function saveSettings(patch) {
    const current = getSettings();
    set("settings", { ...current, ...patch });
  }

  // ─────────────────────────────────────────────────────────────
  // STREAK
  // ─────────────────────────────────────────────────────────────

  function updateStreak() {
    const settings = getSettings();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (settings.lastActiveDate === yesterday) {
      saveSettings({ streakDays: (settings.streakDays || 0) + 1, lastActiveDate: today });
    } else if (settings.lastActiveDate !== today) {
      saveSettings({ streakDays: 1, lastActiveDate: today });
    }
  }

  return {
    set,
    get,
    remove,
    clear,
    addEntry,
    getEntries,
    deleteEntry,
    summarize,
    getLast7Days,
    getLast4Weeks,
    getSettings,
    saveSettings,
    updateStreak,
  };
})();

window.Storage = Storage;
