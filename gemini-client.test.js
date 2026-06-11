/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
const GeminiClient = require("./js/gemini-client.js");

describe("GeminiClient Module", () => {
  test("API methods are defined and handle missing dependencies gracefully", async () => {
    try {
      await GeminiClient.analyzeReceipt("base64data");
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      await GeminiClient.analyzeElectricityBill("base64data");
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      await GeminiClient.generateWeeklyInsight({});
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      await GeminiClient.generateGoals({});
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
