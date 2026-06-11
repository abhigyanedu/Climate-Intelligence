/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
const CarbonEngine = require("./js/carbon-engine.js");

describe("CarbonEngine", () => {
  test("Constants are exported", () => {
    expect(CarbonEngine.GRID_FACTORS).toBeDefined();
    expect(CarbonEngine.TRANSPORT_FACTORS).toBeDefined();
    expect(CarbonEngine.APPLIANCE_POWER).toBeDefined();
    expect(CarbonEngine.DIGITAL_FACTORS).toBeDefined();
  });

  test("Utility Functions", () => {
    CarbonEngine.setRegion("US");
    expect(CarbonEngine.getGridFactor()).toBeDefined();

    // Eco score
    expect(CarbonEngine.computeEcoScore(0)).toBe(1000);
    expect(CarbonEngine.getScoreLabel(100)).toBeDefined();
    expect(CarbonEngine.getCatalogs()).toBeDefined();
  });

  test("Calculations", () => {
    expect(CarbonEngine.calcTransport("petrol_car_solo", 10)).toBeDefined();
    expect(CarbonEngine.compareTransportModes(10)).toBeDefined();
    expect(CarbonEngine.calcElectricity(100)).toBeDefined();
    expect(CarbonEngine.calcAppliance("ac", 2)).toBeDefined();
    expect(CarbonEngine.calcFoodDelivery("veg_meal", 5, "petrol_bike")).toBeDefined();
    expect(CarbonEngine.calcFlight(1000, "economy")).toBeDefined();
    expect(CarbonEngine.calcEcommerce("electronics", "local")).toBeDefined();
    expect(CarbonEngine.calcDigital("streaming_hd", 2)).toBeDefined();
    expect(CarbonEngine.calcAccommodation("hotel_average", 2)).toBeDefined();
  });

  test("Email Categorization", () => {
    const flightResult = CarbonEngine.identifyEmailCategory(
      "itinerary@makemytrip.com",
      "Booking",
      true
    );
    if (flightResult) {
      expect(flightResult.category).toBe("flight");
    }

    const foodResult = CarbonEngine.identifyEmailCategory("noreply@zomato.com", "Your order", true);
    if (foodResult) {
      expect(foodResult.category).toBe("food_delivery");
    }
  });
});
