const fs = require('fs');
const path = require('path');

// Read the carbon-engine.js file and evaluate it to get the CarbonEngine object
const carbonEngineCode = fs.readFileSync(path.join(__dirname, 'js/carbon-engine.js'), 'utf8');
eval(carbonEngineCode);

describe('CarbonEngine', () => {
  describe('Electricity Calculations', () => {
    test('Calculates Indian grid carbon footprint correctly', () => {
      // 100 kWh on IN grid (0.82 kg/kWh) = 82 kg CO2
      const result = CarbonEngine.calculateElectricity(100, 'IN');
      expect(result.co2).toBeCloseTo(82.0, 1);
      expect(result.source).toBe('Electricity (100 kWh) - IN');
    });

    test('Calculates French grid carbon footprint correctly', () => {
      // 100 kWh on FR grid (0.052 kg/kWh) = 5.2 kg CO2
      const result = CarbonEngine.calculateElectricity(100, 'FR');
      expect(result.co2).toBeCloseTo(5.2, 1);
    });

    test('Handles unknown grid gracefully', () => {
      // Default to IN (0.82)
      const result = CarbonEngine.calculateElectricity(100, 'UNKNOWN_GRID');
      expect(result.co2).toBeCloseTo(82.0, 1);
    });
  });

  describe('Transport Calculations', () => {
    test('Calculates solo petrol car journey correctly', () => {
      // 10 km * 0.192 kg/km = 1.92 kg CO2
      const result = CarbonEngine.calculateTransport('petrol_car_solo', 10);
      expect(result.co2).toBeCloseTo(1.92, 2);
    });

    test('Calculates domestic flight correctly', () => {
      // 1000 km * 0.255 kg/km = 255 kg CO2
      const result = CarbonEngine.calculateTransport('flight_domestic', 1000);
      expect(result.co2).toBeCloseTo(255.0, 1);
    });
  });

  describe('Food Calculations', () => {
    test('Calculates veg meal correctly', () => {
      // 1 veg meal (0.9)
      const result = CarbonEngine.calculateFood('veg_meal', 1);
      expect(result.co2).toBeCloseTo(0.9, 1);
    });

    test('Calculates multiple beef meals correctly', () => {
      // 3 beef meals (14.0 * 3)
      const result = CarbonEngine.calculateFood('beef_meal', 3);
      expect(result.co2).toBeCloseTo(42.0, 1);
    });
  });

  describe('Receipt Categorization', () => {
    test('Identifies quick commerce receipts', () => {
      const result = CarbonEngine.identifyEmailCategory('orders@zeptonow.com', 'Your Zepto order is delivered', true);
      expect(result).toBeDefined();
      expect(result.platform).toBe('Zepto');
      expect(result.category).toBe('quick_commerce');
    });

    test('Identifies flight bookings', () => {
      const result = CarbonEngine.identifyEmailCategory('itinerary@makemytrip.com', 'Booking confirmed for your flight', true);
      expect(result).toBeDefined();
      expect(result.platform).toBe('MakeMyTrip');
      expect(result.category).toBe('flight');
    });
  });
});
