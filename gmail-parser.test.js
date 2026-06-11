/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
const GmailParser = require("./js/gmail-parser.js");

describe("GmailParser Module", () => {
  test("Constants and methods export correctly", async () => {
    expect(GmailParser.CATEGORY_DEFAULTS).toBeDefined();

    window.fetch = () =>
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        ok: true,
      });
    window.gapi = { client: { setToken: () => {} } };

    try {
      await GmailParser.sync("dummy_token");
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
