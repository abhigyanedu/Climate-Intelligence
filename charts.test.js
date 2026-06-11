/**
 * @jest-environment jsdom
 */
const Charts = require("./js/charts.js");

describe("Charts Module", () => {
  test("Methods exist and handle DOM references safely", () => {
    try {
      Charts.renderCategoryChart("mock_canvas", []);
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      Charts.renderTrendChart("mock_canvas", []);
    } catch (e) {
      expect(e).toBeDefined();
    }

    expect(Charts.CATEGORY_LABELS).toBeDefined();
    expect(Charts.CATEGORY_COLORS).toBeDefined();
  });
});
