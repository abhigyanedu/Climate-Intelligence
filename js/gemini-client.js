/**
 * EcoMind — Gemini API Client
 * ============================
 * Wraps Gemini Flash for:
 *  1. Image analysis (receipts, electricity bills)
 *  2. AI insight generation (weekly summaries, goals)
 */

const GeminiClient = (() => {
  const MODEL = "gemini-2.0-flash";
  const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  /**
   * Core generate call.
   * @param {Array} parts - array of {text} or {inlineData: {mimeType, data}}
   * @returns {string} Gemini response text
   */
  async function _generate(parts, retries = 3) {
    const cfg = window.ECOMIND_CONFIG;
    if (!cfg || cfg.DEMO_MODE || !cfg.GEMINI_API_KEY || cfg.GEMINI_API_KEY.startsWith("YOUR_")) {
      return null; // Demo mode — caller handles fallback
    }

    const url = `${BASE_URL}?key=${cfg.GEMINI_API_KEY}`;
    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    };

    let attempt = 0;
    while (attempt < retries) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err?.error?.message || "Unknown";

          if (res.status === 400) {
            throw new Error(`Invalid API Key or Bad Request: ${errMsg}`);
          }
          if (res.status === 429) {
            // Quota exceeded or rate limited
            if (attempt < retries - 1) {
              attempt++;
              const waitMs = Math.pow(2, attempt) * 1000;
              console.warn(`[Gemini] Rate limited. Retrying in ${waitMs}ms...`);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
            throw new Error(`Quota Exceeded: ${errMsg}`);
          }
          throw new Error(`Gemini error ${res.status}: ${errMsg}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } catch (err) {
        if (err.message.includes("Quota") || err.message.includes("Invalid")) {
          throw err; // don't retry hard errors
        }
        if (attempt >= retries - 1) throw err;
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  /**
   * Convert a File/Blob to base64.
   */
  async function _toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Analyze a receipt image.
   * @param {File} imageFile
   * @returns {{ items: Array<{name, qty, price}>, category: string } | null}
   */
  async function analyzeReceipt(imageFile) {
    const cfg = window.ECOMIND_CONFIG;
    if (cfg?.DEMO_MODE) return _demoReceiptResult();
    if (!cfg?.GEMINI_API_KEY?.startsWith("AIza")) {
      document.getElementById("api-key-modal")?.classList.remove("hidden");
      throw new Error("Please provide your Gemini API Key to scan receipts.");
    }

    const base64 = await _toBase64(imageFile);
    const prompt = `You are a carbon footprint analyst. Analyze this shopping receipt image.

Extract ALL purchased items. For each item identify:
1. Product name
2. Quantity  
3. Price (if visible)
4. Carbon category: one of [food_veg, food_nonveg, dairy, electronics, clothing, home_goods, beauty, grocery, book, toy, appliance]

Also identify the store/vendor name and total amount if visible.

Respond ONLY with valid JSON in this exact format:
{
  "vendor": "store name",
  "total": 0.00,
  "items": [
    {"name": "item name", "qty": 1, "price": 0.00, "category": "category_key"}
  ]
}`;

    try {
      const text = await _generate([
        { text: prompt },
        { inlineData: { mimeType: imageFile.type || "image/jpeg", data: base64 } },
      ]);
      return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch (e) {
      console.error("[Gemini] Receipt analysis failed:", e);
      return null;
    }
  }

  /**
   * Analyze an electricity bill image.
   * @param {File} imageFile
   * @returns {{ kWh: number, period: string, provider: string, amount: number } | null}
   */
  async function analyzeElectricityBill(imageFile) {
    const cfg = window.ECOMIND_CONFIG;
    if (cfg?.DEMO_MODE) return _demoBillResult();
    if (!cfg?.GEMINI_API_KEY?.startsWith("AIza")) {
      document.getElementById("api-key-modal")?.classList.remove("hidden");
      throw new Error("Please provide your Gemini API Key to scan bills.");
    }

    const base64 = await _toBase64(imageFile);
    const prompt = `You are an electricity bill analyst. Extract information from this electricity bill image.

Find and extract:
1. Total units consumed (kWh or Units) — this is the most important field
2. Billing period (start date and end date)
3. Provider/utility company name
4. Total amount due
5. Meter reading (if visible)

Respond ONLY with valid JSON:
{
  "kWh": 0,
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD", 
  "provider": "utility name",
  "amount": 0.00,
  "meter_reading": null
}

If a field is not visible, use null. For kWh, look for "Units Consumed", "Total Units", "Net Consumption", or similar labels.`;

    try {
      const text = await _generate([
        { text: prompt },
        { inlineData: { mimeType: imageFile.type || "image/jpeg", data: base64 } },
      ]);
      return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch (e) {
      console.error("[Gemini] Bill analysis failed:", e);
      return null;
    }
  }

  /**
   * Generate a personalized weekly carbon insight.
   * @param {{ summary, lastWeek, topCategory, userName }} data
   * @returns {string} AI-generated insight text
   */
  async function generateWeeklyInsight(data) {
    const cfg = window.ECOMIND_CONFIG;
    if (cfg?.DEMO_MODE || !cfg?.GEMINI_API_KEY?.startsWith("AIza")) {
      return _demoInsight(data);
    }

    const { summary, lastWeek, topCategory, userName } = data;
    const delta = lastWeek ? (((summary.total - lastWeek) / lastWeek) * 100).toFixed(1) : null;

    const prompt = `You are EcoMind, a friendly and encouraging carbon footprint advisor. 
    
Generate a personalized 3-sentence insight for ${userName || "the user"}.

This week's carbon data:
- Total: ${summary.total.toFixed(1)} kg CO₂e
- Biggest category: ${topCategory}
- vs last week: ${delta ? `${delta > 0 ? "+" : ""}${delta}%` : "first week"}
- Breakdown: ${JSON.stringify(summary.byCategory)}

Rules:
1. First sentence: Name their single biggest impact area with specific numbers
2. Second sentence: One specific, actionable change they can make THIS week (be concrete)  
3. Third sentence: Positive/motivating close (if improved) OR gentle encouragement (if not)
Tone: Friendly, non-judgmental, practical. No jargon. No bullet points. Just 3 sentences.`;

    try {
      return await _generate([{ text: prompt }]);
    } catch (e) {
      console.error("[Gemini] Insight generation failed:", e);
      return _demoInsight(data);
    }
  }

  /**
   * Generate smart carbon reduction goals.
   * @param {{ summary, settings }} profile
   * @returns {Array<{title, target, unit, impact}>}
   */
  async function generateGoals(profile) {
    const cfg = window.ECOMIND_CONFIG;
    if (cfg?.DEMO_MODE || !cfg?.GEMINI_API_KEY?.startsWith("AIza")) {
      return _demoGoals(profile);
    }

    const prompt = `You are EcoMind. Based on this user's carbon profile, suggest 3 specific, achievable 30-day goals.

Profile: ${JSON.stringify(profile.summary?.byCategory || {})}
Region: ${profile.settings?.region || "IN"}

Return ONLY valid JSON array:
[
  {
    "title": "short goal title",
    "description": "one sentence description of how to achieve it",
    "target_reduction_kg": 10,
    "category": "transport|food_delivery|electricity|ecommerce|digital|flight",
    "difficulty": "easy|medium|hard"
  }
]

Make goals specific to their actual usage. If they use Zomato a lot, suggest reducing food delivery.
If high electricity, suggest AC temperature changes. Keep it practical for India.`;

    try {
      const text = await _generate([{ text: prompt }]);
      return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch (e) {
      console.error("[Gemini] Goal generation failed:", e);
      return _demoGoals(profile);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DEMO FALLBACKS
  // ─────────────────────────────────────────────────────────────

  function _demoReceiptResult() {
    return {
      vendor: "Sample Store",
      total: 850,
      items: [
        { name: "Rice (5kg)", qty: 1, price: 250, category: "grocery" },
        { name: "Chicken (1kg)", qty: 1, price: 300, category: "food_nonveg" },
        { name: "Vegetables", qty: 1, price: 150, category: "food_veg" },
        { name: "Milk (2L)", qty: 2, price: 75, category: "dairy" },
      ],
    };
  }

  function _demoBillResult() {
    return {
      kWh: 210,
      period_start: "2024-11-01",
      period_end: "2024-11-30",
      provider: "BESCOM",
      amount: 1680,
      meter_reading: null,
    };
  }

  function _demoInsight(data) {
    const category = data.topCategory || "food delivery";
    const tips = {
      food_delivery:
        "Your food delivery orders are your top carbon source this week — try cooking at home 3 days instead of ordering to cut ~4 kg CO₂. Switching even one order to a vegetarian meal can make a big difference. You're already tracking — that awareness puts you ahead of 90% of people!",
      transport_cab:
        "Cab rides are your biggest carbon contributor this week at over 8 kg CO₂. Try taking the metro for your regular commute — it cuts emissions by 78% per trip. Small shifts add up fast, and you're on the right track by monitoring your footprint!",
      electricity:
        "Your home electricity usage is the biggest slice of your carbon footprint this week. Setting your AC to 24°C instead of 20°C can reduce cooling energy by 24% — that's roughly 15 kg CO₂ saved per month. You've taken the hardest step by measuring — now let's reduce!",
      flight:
        "Your flight this week contributed the most to your footprint — flights are carbon-intensive but unavoidable sometimes. Consider offsetting through a verified program, and choose economy class when possible (it's 3× lower impact than business). Every other category you optimize now makes a real difference!",
      ecommerce:
        "Online shopping deliveries drove most of your carbon this week. Consolidating orders into weekly batches instead of daily can cut delivery emissions by up to 30%. You're tracking what matters — that's the foundation of real change!",
    };
    return tips[category] || tips.food_delivery;
  }

  function _demoGoals(profile) {
    return [
      {
        title: "Metro Over Cab 3x/Week",
        description: "Replace 3 Ola/Uber trips per week with metro or bus to save ~6 kg CO₂/month.",
        target_reduction_kg: 24,
        category: "transport",
        difficulty: "easy",
      },
      {
        title: "2 Veg Days Per Week",
        description: "Skip meat for 2 days each week — saves ~8 kg CO₂/month on food production.",
        target_reduction_kg: 32,
        category: "food_delivery",
        difficulty: "easy",
      },
      {
        title: "AC at 24°C, Not 20°C",
        description: "Raise your AC thermostat by 4°C to cut cooling energy by ~24% this summer.",
        target_reduction_kg: 18,
        category: "electricity",
        difficulty: "easy",
      },
    ];
  }

  return { analyzeReceipt, analyzeElectricityBill, generateWeeklyInsight, generateGoals };
})();

window.GeminiClient = GeminiClient;
