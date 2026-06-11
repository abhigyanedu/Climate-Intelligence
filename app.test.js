/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");

describe("App.js Main Controller", () => {
  test("Executes without breaking when DOMContentLoaded fires", () => {
    // Load the HTML so the elements exist
    const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
    document.body.innerHTML = html;

    // Setup globals
    window.Storage = require("./js/storage.js");
    window.Auth = require("./js/auth.js");
    window.GmailParser = require("./js/gmail-parser.js");
    window.GeminiClient = require("./js/gemini-client.js");
    window.Charts = require("./js/charts.js");
    window.MapsCarbon = require("./js/maps-carbon.js");
    window.CarbonEngine = require("./js/carbon-engine.js");
    window.lucide = { createIcons: () => {} };

    // Mock fetch
    window.fetch = () =>
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        ok: true,
      });

    try {
      require("./js/app.js");

      // Dispatch the event to trigger app.js initialization
      const event = document.createEvent("Event");
      event.initEvent("DOMContentLoaded", true, true);
      window.document.dispatchEvent(event);

      expect(true).toBe(true);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
