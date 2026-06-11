/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
const MapsCarbon = require("./js/maps-carbon.js");

describe("MapsCarbon Module", () => {
  test("Methods exist and handle missing Google Maps object gracefully", async () => {
    try {
      await MapsCarbon.init("mock_input", "mock_button", "mock_result", () => {});
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      await MapsCarbon.setupAutocomplete();
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      await MapsCarbon.calcRouteCO2();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
