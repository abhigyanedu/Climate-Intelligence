const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorageMock = (function() {
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
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Read the storage.js file and evaluate it
const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
eval(storageCode);

describe('Storage Module', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('Saves and retrieves settings correctly', () => {
    Storage.saveSettings({ gridRegion: 'GB', isGlobalMode: true });
    
    const settings = Storage.getSettings();
    expect(settings.gridRegion).toBe('GB');
    expect(settings.isGlobalMode).toBe(true);
    expect(settings.gmailSynced).toBe(false); // default value
  });

  test('Adds carbon log entries correctly', () => {
    const entry1 = { category: 'transport', co2: 5.5, source: 'Uber', date: '2023-10-01' };
    const entry2 = { category: 'food_delivery', co2: 2.1, source: 'Zomato', date: '2023-10-02' };
    
    Storage.addEntry(entry1);
    Storage.addEntry(entry2);
    
    const entries = Storage.getEntries();
    expect(entries.length).toBe(2);
    expect(entries[0].co2).toBe(2.1); // Sorted by date desc
    expect(entries[1].co2).toBe(5.5);
  });

  test('Summarizes carbon footprint correctly', () => {
    Storage.addEntry({ category: 'transport', co2: 10, date: '2023-10-01' });
    Storage.addEntry({ category: 'transport', co2: 5, date: '2023-10-02' });
    Storage.addEntry({ category: 'food_delivery', co2: 2.5, date: '2023-10-02' });
    
    const summary = Storage.summarize({ from: '2023-10-01', to: '2023-10-03' });
    
    expect(summary.total).toBe(17.5);
    expect(summary.byCategory.transport).toBe(15);
    expect(summary.byCategory.food_delivery).toBe(2.5);
  });

  test('Respects date filters when summarizing', () => {
    Storage.addEntry({ category: 'transport', co2: 10, date: '2023-10-01' });
    Storage.addEntry({ category: 'transport', co2: 5, date: '2023-10-10' });
    
    const summary = Storage.summarize({ from: '2023-10-01', to: '2023-10-05' });
    expect(summary.total).toBe(10);
  });
});
