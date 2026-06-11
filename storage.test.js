/**
 * @jest-environment jsdom
 */
const Storage = require("./js/storage.js");

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Storage Module", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("Basic functionality", () => {
    Storage.set("test", { a: 1 });
    expect(Storage.get("test").a).toBe(1);

    Storage.remove("test");
    expect(Storage.get("test")).toBeNull();

    Storage.clear();
  });

  test("Settings", () => {
    Storage.saveSettings({ region: "US" });
    expect(Storage.getSettings().region).toBe("US");
  });

  test("Entries and Summaries", () => {
    Storage.addEntry({ category: "transport", co2: 2.1, timestamp: Date.now() });
    Storage.addEntry({ category: "food", co2: 5.5, timestamp: Date.now() });

    const entries = Storage.getEntries();
    expect(entries.length).toBe(2);

    Storage.deleteEntry(entries[0].id);
    expect(Storage.getEntries().length).toBe(1);

    expect(Storage.summarize()).toBeDefined();
    expect(Storage.getLast7Days()).toBeDefined();
    expect(Storage.getLast4Weeks()).toBeDefined();
  });

  test("Streak", () => {
    Storage.updateStreak();
    expect(Storage.getSettings().streakDays).toBeDefined();
  });
});
