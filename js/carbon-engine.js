/**
 * EcoMind Carbon Engine
 * =====================
 * Single source of truth for all CO₂ emission calculations.
 * All factors are peer-reviewed (IPCC 2023, DEFRA 2023, CEA 2023).
 *
 * Units: kg CO₂ equivalent (kg CO₂e) throughout.
 */

const CarbonEngine = (() => {
  // ─────────────────────────────────────────────────────────────
  // ELECTRICITY GRID FACTORS (kg CO₂/kWh)
  // Sources: IEA 2023, CEA Annual Report 2023, EPA eGRID 2023
  // ─────────────────────────────────────────────────────────────
  const GRID_FACTORS = {
    IN: { name: "India", factor: 0.82, currency: "INR" },
    US: { name: "United States", factor: 0.386, currency: "USD" },
    GB: { name: "United Kingdom", factor: 0.193, currency: "GBP" },
    EU: { name: "European Union (avg)", factor: 0.231, currency: "EUR" },
    DE: { name: "Germany", factor: 0.364, currency: "EUR" },
    FR: { name: "France", factor: 0.052, currency: "EUR" },
    AU: { name: "Australia", factor: 0.79, currency: "AUD" },
    CN: { name: "China", factor: 0.557, currency: "CNY" },
    JP: { name: "Japan", factor: 0.462, currency: "JPY" },
    SG: { name: "Singapore", factor: 0.408, currency: "SGD" },
    CA: { name: "Canada", factor: 0.13, currency: "CAD" },
    BR: { name: "Brazil", factor: 0.074, currency: "BRL" },
    ZA: { name: "South Africa", factor: 0.928, currency: "ZAR" },
    NG: { name: "Nigeria", factor: 0.431, currency: "NGN" },
    AE: { name: "UAE", factor: 0.396, currency: "AED" },
    MY: { name: "Malaysia", factor: 0.585, currency: "MYR" },
    ID: { name: "Indonesia", factor: 0.761, currency: "IDR" },
  };

  // ─────────────────────────────────────────────────────────────
  // TRANSPORT EMISSION FACTORS (kg CO₂/km)
  // Sources: IPCC 2023 AR6, DEFRA 2023, ICCT
  // ─────────────────────────────────────────────────────────────
  const TRANSPORT_FACTORS = {
    petrol_car_solo:    { factor: 0.192, label: "Petrol Car (solo)", icon: "🚗" },
    petrol_car_shared:  { factor: 0.096, label: "Petrol Car (shared)", icon: "🚗" },
    diesel_car_solo:    { factor: 0.171, label: "Diesel Car (solo)", icon: "🚙" },
    diesel_car_shared:  { factor: 0.086, label: "Diesel Car (shared)", icon: "🚙" },
    electric_car:       { factor: 0.053, label: "Electric Car (India grid)", icon: "⚡" },
    cab_ola_uber:       { factor: 0.149, label: "Cab / Ola / Uber", icon: "🚕" },
    autorickshaw:       { factor: 0.098, label: "Auto Rickshaw (CNG)", icon: "🛺" },
    motorcycle_petrol:  { factor: 0.114, label: "Motorbike (petrol)", icon: "🏍️" },
    motorcycle_electric:{ factor: 0.027, label: "E-Scooter", icon: "🛵" },
    bus_diesel:         { factor: 0.089, label: "Bus (diesel)", icon: "🚌" },
    bus_electric:       { factor: 0.021, label: "Electric Bus", icon: "🚌" },
    metro_rail:         { factor: 0.041, label: "Metro / Local Train", icon: "🚇" },
    irctc_train:        { factor: 0.0138, label: "Indian Railways", icon: "🚂" },
    flight_domestic:    { factor: 0.255, label: "Domestic Flight", icon: "✈️" },
    flight_short_haul:  { factor: 0.195, label: "Short-Haul Flight (<3h)", icon: "✈️" },
    flight_long_haul_eco:  { factor: 0.148, label: "Long-Haul Flight (Economy)", icon: "✈️" },
    flight_long_haul_biz:  { factor: 0.429, label: "Long-Haul Flight (Business)", icon: "✈️" },
    flight_long_haul_first:{ factor: 0.590, label: "Long-Haul Flight (First)", icon: "✈️" },
    walking:            { factor: 0.0,   label: "Walking", icon: "🚶" },
    cycling:            { factor: 0.0,   label: "Cycling", icon: "🚲" },
    ferry:              { factor: 0.114, label: "Ferry", icon: "⛴️" },
  };

  // ─────────────────────────────────────────────────────────────
  // FOOD & DELIVERY FACTORS
  // ─────────────────────────────────────────────────────────────
  const FOOD_FACTORS = {
    // Per meal carbon (kg CO₂e) — food production only
    veg_meal:           0.9,   // Vegetarian
    egg_meal:           1.6,   // Includes eggs
    chicken_meal:       3.5,   // Poultry
    mutton_meal:        9.5,   // Red meat (mutton/lamb)
    beef_meal:          14.0,  // Beef (rare in India, but global)
    fish_meal:          2.0,   // Seafood
    paneer_meal:        4.2,   // Dairy-heavy (Indian context)

    // Delivery overhead (kg CO₂e per order)
    delivery_bike_5km:    0.28,  // Avg 5km on petrol bike
    delivery_bike_10km:   0.56,
    delivery_ev_5km:      0.07,  // EV delivery (Swiggy green fleet)
    packaging_standard:   0.3,   // Plastic containers
    packaging_eco:        0.05,  // Paper/compostable

    // Quick commerce premium (cold chain + expedited logistics)
    quick_commerce_premium: 0.8,
  };

  // ─────────────────────────────────────────────────────────────
  // E-COMMERCE / SHOPPING FACTORS (kg CO₂e per order)
  // ─────────────────────────────────────────────────────────────
  const SHOPPING_FACTORS = {
    // Product category manufacturing carbon
    electronics_phone:    70.0,
    electronics_laptop:   300.0,
    electronics_tablet:   100.0,
    electronics_small:    8.0,   // Earphones, chargers etc.
    clothing_fast_fashion:8.5,
    clothing_quality:     12.0,
    shoes:                14.0,
    books:                1.0,
    groceries_local:      0.5,
    groceries_packaged:   2.0,
    furniture_large:      72.0,
    furniture_small:      15.0,
    beauty_cosmetics:     3.0,
    home_appliance_large: 150.0,
    home_appliance_small: 25.0,
    toys:                 4.0,

    // Shipping distance carbon (kg CO₂e per order)
    shipping_same_city:   0.5,
    shipping_domestic:    2.0,
    shipping_regional:    4.5,
    shipping_international_air: 8.0,
    shipping_international_sea: 2.5,
  };

  // ─────────────────────────────────────────────────────────────
  // APPLIANCE / HOME ENERGY (kWh per hour unless noted)
  // Sources: BEE India ratings, IEA
  // ─────────────────────────────────────────────────────────────
  const APPLIANCE_POWER = {
    ac_1ton:            0.9,    // kWh/hr (BEE 3-star)
    ac_1point5ton:      1.4,    // kWh/hr
    ac_2ton:            1.8,    // kWh/hr
    ac_inverter_1point5ton: 0.9, // Inverter AC
    ceiling_fan:        0.075,  // kWh/hr
    table_fan:          0.04,
    refrigerator_small: 0.03,   // kWh/hr (running avg)
    refrigerator_large: 0.05,
    washing_machine_per_load: 1.0, // kWh per load
    geyser_3kw:         3.0,    // kWh per 1hr use
    microwave:          1.2,    // kWh/hr
    tv_led_40inch:      0.08,
    tv_led_55inch:      0.12,
    laptop:             0.045,
    desktop_pc:         0.18,
    led_bulb:           0.01,   // 10W bulb
    induction_cooktop:  2.0,    // kWh/hr
    water_pump:         0.75,
    air_purifier:       0.06,
  };

  // ─────────────────────────────────────────────────────────────
  // DIGITAL / SCREEN TIME FACTORS (kg CO₂e per hour)
  // Sources: IEA, published ML carbon papers (Lottick 2019, etc.)
  // ─────────────────────────────────────────────────────────────
  const DIGITAL_FACTORS = {
    streaming_sd:       0.013,  // Netflix/YouTube SD
    streaming_hd:       0.036,  // Netflix/YouTube HD
    streaming_4k:       0.076,  // 4K streaming
    video_call_hd:      0.157,  // Zoom/Meet HD
    video_call_sd:      0.04,
    ai_chatbot:         0.030,  // ChatGPT, Gemini (per query ~0.001-0.01)
    social_media:       0.004,  // Instagram, Twitter browsing
    gaming_cloud:       0.100,  // GeForce Now, Xbox Cloud
    gaming_device:      0.01,   // On-device gaming
    email:              0.0003, // Per email (Carbon Literacy Trust)
    web_browsing:       0.002,  // Per hour
    music_streaming:    0.001,  // Spotify/Apple Music per hour
  };

  // ─────────────────────────────────────────────────────────────
  // HOTEL / ACCOMMODATION (kg CO₂e per night)
  // ─────────────────────────────────────────────────────────────
  const ACCOMMODATION_FACTORS = {
    budget_hotel:       8.0,
    mid_range_hotel:    15.0,
    luxury_hotel:       45.0,
    hostel:             3.0,
    airbnb_apartment:   7.0,
    camping:            0.5,
  };

  // ─────────────────────────────────────────────────────────────
  // INDIAN EMAIL SENDER PATTERNS
  // ─────────────────────────────────────────────────────────────
  const INDIA_EMAIL_PATTERNS = {
    // Food Delivery
    zomato:     { senders: ["noreply@zomato.com", "no-reply@zomato.com", "orders@zomato.com"], category: "food_delivery", platform: "Zomato" },
    swiggy:     { senders: ["no-reply@swiggy.in", "noreply@swiggy.in", "orders@swiggy.in"], category: "food_delivery", platform: "Swiggy" },
    // Quick Commerce
    blinkit:    { senders: ["noreply@blinkit.com", "support@blinkit.com", "orders@blinkit.com"], category: "quick_commerce", platform: "Blinkit" },
    zepto:      { senders: ["support@zeptonow.com", "orders@zeptonow.com", "noreply@zeptonow.com"], category: "quick_commerce", platform: "Zepto" },
    dunzo:      { senders: ["support@dunzo.in", "noreply@dunzo.in"], category: "quick_commerce", platform: "Dunzo" },
    instamart:  { senders: ["noreply@swiggy.in"], category: "quick_commerce", platform: "Instamart", subjectKeyword: "Instamart" },
    bigbasket:  { senders: ["noreply@bigbasket.com", "care@bigbasket.com"], category: "quick_commerce", platform: "BigBasket" },
    // E-Commerce
    amazon_in:  { senders: ["shipment-tracking@amazon.in", "order-update@amazon.in", "auto-confirm@amazon.in", "returns@amazon.in"], category: "ecommerce", platform: "Amazon.in" },
    flipkart:   { senders: ["noreply@flipkart.com", "seller-notifications@flipkart.com", "track@flipkart.com"], category: "ecommerce", platform: "Flipkart" },
    myntra:     { senders: ["noreply@myntra.com", "care@myntra.com"], category: "ecommerce", platform: "Myntra" },
    meesho:     { senders: ["noreply@meesho.com", "support@meesho.com"], category: "ecommerce", platform: "Meesho" },
    ajio:       { senders: ["noreply@ajio.com", "support@ajio.com"], category: "ecommerce", platform: "AJIO" },
    // Transport - Cabs
    ola:        { senders: ["no-reply@olacabs.com", "noreply@olacabs.com", "support@olacabs.com"], category: "transport_cab", platform: "Ola" },
    uber:       { senders: ["uber.india@uber.com", "noreply@uber.com", "receipts@uber.com"], category: "transport_cab", platform: "Uber" },
    rapido:     { senders: ["noreply@rapido.bike", "support@rapido.bike"], category: "transport_cab", platform: "Rapido" },
    // Transport - Flights
    indigo:     { senders: ["eticket@goindigo.in", "noreply@goindigo.in", "loyalty@goindigo.in"], category: "flight", platform: "IndiGo" },
    air_india:  { senders: ["airindia@airindia.in", "noreply@airindia.in", "flyingreturnsenquiry@airindia.in"], category: "flight", platform: "Air India" },
    spicejet:   { senders: ["bookings@spicejet.com", "noreply@spicejet.com"], category: "flight", platform: "SpiceJet" },
    akasa:      { senders: ["noreply@akasaair.com", "support@akasaair.com"], category: "flight", platform: "Akasa Air" },
    vistara:    { senders: ["noreply@airvistara.com", "loyalty@airvistara.com"], category: "flight", platform: "Vistara" },
    // Transport - Train
    irctc:      { senders: ["donotreply-irctc@irctc.co.in", "irctccare@irctc.co.in", "noreply@irctc.co.in"], category: "transport_train", platform: "IRCTC" },
    // Travel OTAs
    makemytrip: { senders: ["support@makemytrip.com", "noreply@makemytrip.com", "bookings@makemytrip.com"], category: "travel", platform: "MakeMyTrip" },
    goibibo:    { senders: ["noreply@goibibo.com", "bookings@goibibo.com"], category: "travel", platform: "Goibibo" },
    // Accommodation
    oyo:        { senders: ["service@oyorooms.com", "noreply@oyorooms.com"], category: "accommodation", platform: "OYO" },
    // Electricity Bills
    bescom:     { senders: ["bescom@bescom.org", "noreply@bescom.org"], category: "electricity", platform: "BESCOM" },
    tata_power: { senders: ["customercare@tatapower.com", "noreply@tatapower.com"], category: "electricity", platform: "Tata Power" },
    bses:       { senders: ["consumercare@bsesdelhi.com", "noreply@bses.in"], category: "electricity", platform: "BSES Delhi" },
    msedcl:     { senders: ["noreply@mahadiscom.in", "consumer@mahadiscom.in"], category: "electricity", platform: "MSEDCL" },
  };

  // ─────────────────────────────────────────────────────────────
  // GLOBAL EMAIL PATTERNS
  // ─────────────────────────────────────────────────────────────
  const GLOBAL_EMAIL_PATTERNS = {
    doordash:   { senders: ["receipts@doordash.com", "no-reply@doordash.com"], category: "food_delivery", platform: "DoorDash" },
    ubereats:   { senders: ["uber.receipts@uber.com"], category: "food_delivery", platform: "Uber Eats", subjectKeyword: "Eats" },
    instacart:  { senders: ["orders@instacart.com", "receipts@instacart.com"], category: "quick_commerce", platform: "Instacart" },
    amazon_com: { senders: ["shipment-tracking@amazon.com", "auto-confirm@amazon.com"], category: "ecommerce", platform: "Amazon" },
    ebay:       { senders: ["ebay@ebay.com", "member@ebay.com"], category: "ecommerce", platform: "eBay" },
    shopify:    { senders: ["no-reply@shopify.com", "shopify@shopify.com"], category: "ecommerce", platform: "Shopify Store" },
    united:     { senders: ["unitedairlines@united.com", "mileageplus@united.com"], category: "flight", platform: "United Airlines" },
    delta:      { senders: ["delta@e.delta.com", "skymiles@delta.com"], category: "flight", platform: "Delta" },
    american:   { senders: ["aainfo@aa.com", "advantageinfo@aa.com"], category: "flight", platform: "American Airlines" },
    emirates:   { senders: ["info@emirates.com", "noreply@emirates.com"], category: "flight", platform: "Emirates" },
    singapore:  { senders: ["CustomerServices@singaporeair.com.sg"], category: "flight", platform: "Singapore Airlines" },
    lyft:       { senders: ["no-reply@lyft.com", "receipts@lyft.com"], category: "transport_cab", platform: "Lyft" },
    grab:       { senders: ["support@grab.com", "no-reply@grab.com"], category: "transport_cab", platform: "Grab" },
    gojek:      { senders: ["noreply@gojek.com"], category: "transport_cab", platform: "Gojek" },
  };

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  let currentRegion = "IN";

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Set the user's region for electricity calculations.
   * @param {string} regionCode - ISO 3166-1 alpha-2 code (e.g. "IN", "US")
   */
  function setRegion(regionCode) {
    if (GRID_FACTORS[regionCode]) {
      currentRegion = regionCode;
    }
  }

  /**
   * Get current grid factor (kg CO₂/kWh).
   */
  function getGridFactor(regionCode) {
    const code = regionCode || currentRegion;
    return GRID_FACTORS[code]?.factor ?? GRID_FACTORS.IN.factor;
  }

  /**
   * Calculate transport CO₂.
   * @param {string} mode - key from TRANSPORT_FACTORS
   * @param {number} distanceKm
   * @returns {number} kg CO₂e
   */
  function calcTransport(mode, distanceKm) {
    if (distanceKm <= 0) return 0;
    const factor = TRANSPORT_FACTORS[mode]?.factor ?? 0;
    return parseFloat((factor * distanceKm).toFixed(3));
  }

  /**
   * Compare CO₂ across all transport modes for a given distance.
   * @param {number} distanceKm
   * @returns {Array} sorted array of {mode, label, icon, co2}
   */
  function compareTransportModes(distanceKm) {
    return Object.entries(TRANSPORT_FACTORS)
      .map(([mode, { factor, label, icon }]) => ({
        mode,
        label,
        icon,
        co2: parseFloat((factor * distanceKm).toFixed(3)),
      }))
      .sort((a, b) => a.co2 - b.co2);
  }

  /**
   * Calculate electricity CO₂ from kWh.
   * @param {number} kWh
   * @param {string} [regionCode]
   * @returns {number} kg CO₂e
   */
  function calcElectricity(kWh, regionCode) {
    const gridFactor = getGridFactor(regionCode);
    return parseFloat((kWh * gridFactor).toFixed(3));
  }

  /**
   * Calculate appliance CO₂.
   * @param {string} appliance - key from APPLIANCE_POWER
   * @param {number} hoursPerDay
   * @param {number} days
   * @param {string} [regionCode]
   * @returns {number} kg CO₂e
   */
  function calcAppliance(appliance, hoursPerDay, days, regionCode) {
    const kWhPerHour = APPLIANCE_POWER[appliance] ?? 0;
    const totalKWh = kWhPerHour * hoursPerDay * days;
    return calcElectricity(totalKWh, regionCode);
  }

  /**
   * Calculate food delivery CO₂.
   * @param {string} foodType - key from FOOD_FACTORS (e.g. 'veg_meal')
   * @param {boolean} isQuickCommerce - Blinkit/Zepto etc.
   * @param {number} [deliveryDistanceKm=5]
   * @returns {{ total: number, breakdown: object }}
   */
  function calcFoodDelivery(foodType, isQuickCommerce = false, deliveryDistanceKm = 5) {
    const foodCO2 = FOOD_FACTORS[foodType] ?? FOOD_FACTORS.veg_meal;
    const deliveryKm = Math.min(deliveryDistanceKm, 20);
    const deliveryCO2 = deliveryKm <= 5
      ? FOOD_FACTORS.delivery_bike_5km
      : FOOD_FACTORS.delivery_bike_10km;
    const packagingCO2 = FOOD_FACTORS.packaging_standard;
    const quickPremium = isQuickCommerce ? FOOD_FACTORS.quick_commerce_premium : 0;

    const total = parseFloat((foodCO2 + deliveryCO2 + packagingCO2 + quickPremium).toFixed(3));
    return {
      total,
      breakdown: {
        food: foodCO2,
        delivery: deliveryCO2,
        packaging: packagingCO2,
        quick_premium: quickPremium,
      },
    };
  }

  /**
   * Calculate flight CO₂.
   * Includes Radiative Forcing Index (RFI = 1.9) for high-altitude warming effect.
   * @param {number} distanceKm
   * @param {string} flightClass - 'economy'|'business'|'first'|'domestic'
   * @param {boolean} [includeRFI=true]
   * @returns {number} kg CO₂e
   */
  function calcFlight(distanceKm, flightClass = "economy", includeRFI = true) {
    const RFI = includeRFI ? 1.9 : 1.0;
    let baseFactor;

    if (distanceKm < 500) {
      baseFactor = TRANSPORT_FACTORS.flight_domestic.factor;
    } else if (distanceKm < 3700) {
      baseFactor = TRANSPORT_FACTORS.flight_short_haul.factor;
    } else {
      switch (flightClass) {
        case "business": baseFactor = TRANSPORT_FACTORS.flight_long_haul_biz.factor; break;
        case "first":    baseFactor = TRANSPORT_FACTORS.flight_long_haul_first.factor; break;
        default:         baseFactor = TRANSPORT_FACTORS.flight_long_haul_eco.factor;
      }
    }

    // RFI already factored into long-haul values, apply only to short haul
    const rfiMultiplier = distanceKm < 3700 ? RFI : 1.0;
    return parseFloat((baseFactor * distanceKm * rfiMultiplier).toFixed(2));
  }

  /**
   * Calculate ecommerce CO₂.
   * @param {string} productCategory - key from SHOPPING_FACTORS
   * @param {string} shippingType - key from SHOPPING_FACTORS (shipping_*)
   * @returns {{ total: number, breakdown: object }}
   */
  function calcEcommerce(productCategory, shippingType = "shipping_domestic") {
    const productCO2 = SHOPPING_FACTORS[productCategory] ?? 5.0;
    const shippingCO2 = SHOPPING_FACTORS[shippingType] ?? SHOPPING_FACTORS.shipping_domestic;
    return {
      total: parseFloat((productCO2 + shippingCO2).toFixed(2)),
      breakdown: { product: productCO2, shipping: shippingCO2 },
    };
  }

  /**
   * Calculate digital/screen-time CO₂.
   * @param {string} activity - key from DIGITAL_FACTORS
   * @param {number} hours
   * @returns {number} kg CO₂e
   */
  function calcDigital(activity, hours) {
    const factor = DIGITAL_FACTORS[activity] ?? 0;
    return parseFloat((factor * hours).toFixed(4));
  }

  /**
   * Calculate accommodation CO₂.
   * @param {string} type - key from ACCOMMODATION_FACTORS
   * @param {number} nights
   * @returns {number} kg CO₂e
   */
  function calcAccommodation(type, nights) {
    const factor = ACCOMMODATION_FACTORS[type] ?? ACCOMMODATION_FACTORS.mid_range_hotel;
    return parseFloat((factor * nights).toFixed(2));
  }

  /**
   * Identify an email's carbon category based on sender/subject.
   * @param {string} from - email sender address
   * @param {string} subject - email subject
   * @param {boolean} includeGlobal - whether to check global patterns too
   * @returns {{ category: string, platform: string } | null}
   */
  function identifyEmailCategory(from, subject, includeGlobal = true) {
    const fromLower = from.toLowerCase();
    const subjectLower = (subject || "").toLowerCase();

    const allPatterns = includeGlobal
      ? { ...INDIA_EMAIL_PATTERNS, ...GLOBAL_EMAIL_PATTERNS }
      : INDIA_EMAIL_PATTERNS;

    for (const [, config] of Object.entries(allPatterns)) {
      const senderMatch = config.senders.some((s) => fromLower.includes(s.toLowerCase()));
      const keywordMatch = config.subjectKeyword
        ? subjectLower.includes(config.subjectKeyword.toLowerCase())
        : true;

      if (senderMatch && keywordMatch) {
        return { category: config.category, platform: config.platform };
      }
    }
    return null;
  }

  /**
   * Compute an EcoScore (0–1000) from a carbon summary.
   * Higher score = lower carbon footprint.
   * Baseline: 4.7 kg CO₂/day (average Indian) = 141 kg/month → score 500
   * @param {number} monthlyKgCO2
   * @returns {number} 0–1000
   */
  function computeEcoScore(monthlyKgCO2) {
    // India avg: ~141 kg/month → 500
    // Global avg: ~350 kg/month → 200
    // Target: <70 kg/month → 850+
    const BASE = 141;
    const score = Math.round(500 * (BASE / Math.max(monthlyKgCO2, 1)));
    return Math.min(1000, Math.max(0, score));
  }

  /**
   * Get label for EcoScore range.
   */
  function getScoreLabel(score) {
    if (score >= 850) return { label: "Carbon Champion 🌱", color: "#00ff87" };
    if (score >= 650) return { label: "Eco Conscious ♻️", color: "#7fff7f" };
    if (score >= 450) return { label: "Average Footprint 🌍", color: "#ffdd57" };
    if (score >= 250) return { label: "Heavy Footprint ⚠️", color: "#ff9f40" };
    return { label: "Critical Zone 🔴", color: "#ff6b6b" };
  }

  /**
   * Return full catalog for UI dropdowns.
   */
  function getCatalogs() {
    return {
      gridFactors: GRID_FACTORS,
      transportFactors: TRANSPORT_FACTORS,
      foodFactors: FOOD_FACTORS,
      shoppingFactors: SHOPPING_FACTORS,
      appliancePower: APPLIANCE_POWER,
      digitalFactors: DIGITAL_FACTORS,
      accommodationFactors: ACCOMMODATION_FACTORS,
    };
  }

  // Expose public API
  return {
    setRegion,
    getGridFactor,
    calcTransport,
    compareTransportModes,
    calcElectricity,
    calcAppliance,
    calcFoodDelivery,
    calcFlight,
    calcEcommerce,
    calcDigital,
    calcAccommodation,
    identifyEmailCategory,
    computeEcoScore,
    getScoreLabel,
    getCatalogs,
    GRID_FACTORS,
    TRANSPORT_FACTORS,
    APPLIANCE_POWER,
    DIGITAL_FACTORS,
  };
})();

// Make available globally
window.CarbonEngine = CarbonEngine;
