/**
 * EcoMind — Gmail Parser
 * =======================
 * Fetches and categorizes Gmail messages to extract carbon signals.
 * Uses Gmail REST API v1.
 *
 * Detects: food delivery, quick commerce, flights, cabs, e-commerce,
 *          train bookings, electricity bills, hotel bookings.
 */

const GmailParser = (() => {
  const GMAIL_API = "https://www.googleapis.com/gmail/v1";

  // Categories with their default carbon estimates for India
  const CATEGORY_DEFAULTS = {
    food_delivery: { co2: 5.5, label: "Food Delivery", icon: "🍔", color: "#ff6b6b" },
    quick_commerce: { co2: 3.8, label: "Quick Commerce", icon: "⚡", color: "#ff9f40" },
    ecommerce: { co2: 7.5, label: "Online Shopping", icon: "📦", color: "#a855f7" },
    transport_cab: { co2: 3.2, label: "Cab Ride", icon: "🚕", color: "#3b82f6" },
    transport_train: { co2: 0.8, label: "Train Journey", icon: "🚂", color: "#22c55e" },
    flight: { co2: 180, label: "Flight", icon: "✈️", color: "#ef4444" },
    accommodation: { co2: 15, label: "Hotel Stay", icon: "🏨", color: "#8b5cf6" },
    electricity: { co2: null, label: "Electricity Bill", icon: "💡", color: "#f59e0b" },
    travel: { co2: null, label: "Travel Booking", icon: "🗺️", color: "#06b6d4" },
  };

  /**
   * Main sync function — fetches recent emails and identifies carbon events.
   * @param {string} accessToken - Google OAuth access token
   * @param {boolean} isGlobalMode - include global email patterns
   * @param {number} [maxMessages=200] - max messages to scan
   * @returns {Array<{ platform, category, subject, date, estimatedCo2, raw }>}
   */
  async function sync(accessToken, isGlobalMode = false, maxMessages = 200) {
    if (!accessToken || accessToken === "DEMO_TOKEN") {
      return _demoResults();
    }

    try {
      // Build search query — only look at emails from known carbon-emitting services
      const query = _buildSearchQuery(isGlobalMode);
      const messageIds = await _searchMessages(accessToken, query, maxMessages);

      if (!messageIds.length) return [];

      // Fetch message details in parallel batches of 10
      const details = await _batchFetch(accessToken, messageIds, 10);
      const results = [];

      for (const msg of details) {
        const from = _getHeader(msg, "From") || "";
        const subject = _getHeader(msg, "Subject") || "";
        const date = _getHeader(msg, "Date") || "";
        const parsedDate = _parseDate(date);

        const identified = CarbonEngine.identifyEmailCategory(from, subject, isGlobalMode);
        if (!identified) continue;

        const { category, platform } = identified;
        const defaults = CATEGORY_DEFAULTS[category];

        results.push({
          id: msg.id,
          platform,
          category,
          categoryLabel: defaults?.label || category,
          categoryIcon: defaults?.icon || "📧",
          subject: _truncate(subject, 80),
          date: parsedDate,
          estimatedCo2: defaults?.co2, // null = needs Gemini/manual input
          needsReview: defaults?.co2 === null || category === "flight",
          raw: { from, subject, date },
        });
      }

      // Deduplicate by platform+date (same-day orders)
      return _deduplicate(results);
    } catch (e) {
      console.error("[GmailParser] Sync failed:", e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  function _buildSearchQuery(includeGlobal) {
    // India senders
    const indiaSenders = [
      "zomato.com",
      "swiggy.in",
      "blinkit.com",
      "zeptonow.com",
      "dunzo.in",
      "bigbasket.com",
      "amazon.in",
      "flipkart.com",
      "myntra.com",
      "meesho.com",
      "ajio.com",
      "olacabs.com",
      "uber.com",
      "rapido.bike",
      "goindigo.in",
      "airindia.in",
      "spicejet.com",
      "akasaair.com",
      "airvistara.com",
      "irctc.co.in",
      "makemytrip.com",
      "goibibo.com",
      "oyorooms.com",
      "bescom.org",
      "tatapower.com",
      "bsesdelhi.com",
      "mahadiscom.in",
    ];
    const globalSenders = includeGlobal
      ? [
          "doordash.com",
          "instacart.com",
          "amazon.com",
          "ebay.com",
          "delta.com",
          "united.com",
          "aa.com",
          "emirates.com",
          "grab.com",
          "gojek.com",
        ]
      : [];

    const allSenders = [...indiaSenders, ...globalSenders];
    const fromParts = allSenders.map((s) => `from:${s}`).join(" OR ");
    return `(${fromParts})`;
  }

  async function _searchMessages(token, query, maxResults) {
    let ids = [];
    let pageToken = null;

    do {
      const url = new URL(`${GMAIL_API}/users/me/messages`);
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", Math.min(50, maxResults - ids.length));
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Gmail search failed: ${res.status}`);

      const data = await res.json();
      ids = ids.concat((data.messages || []).map((m) => m.id));
      pageToken = data.nextPageToken || null;
    } while (pageToken && ids.length < maxResults);

    return ids.slice(0, maxResults);
  }

  async function _batchFetch(token, ids, batchSize) {
    const results = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const fetches = batch.map((id) =>
        fetch(
          `${GMAIL_API}/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
          .then((r) => r.json())
          .catch(() => null)
      );
      const done = await Promise.all(fetches);
      results.push(...done.filter(Boolean));
    }
    return results;
  }

  function _getHeader(msg, name) {
    return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  function _parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().slice(0, 10);
    try {
      return new Date(dateStr).toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function _truncate(str, max) {
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  function _deduplicate(results) {
    const seen = new Set();
    return results.filter((r) => {
      const key = `${r.platform}:${r.date}:${r.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DEMO DATA — realistic Indian user email history
  // ─────────────────────────────────────────────────────────────
  function _demoResults() {
    const today = new Date();
    const d = (offset) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - offset);
      return dt.toISOString().slice(0, 10);
    };

    return [
      {
        id: "d1",
        platform: "Zomato",
        category: "food_delivery",
        categoryLabel: "Food Delivery",
        categoryIcon: "🍔",
        subject: "Your Zomato order from Punjabi Dhaba is on the way!",
        date: d(0),
        estimatedCo2: 5.5,
        needsReview: false,
      },
      {
        id: "d2",
        platform: "Swiggy",
        category: "food_delivery",
        categoryLabel: "Food Delivery",
        categoryIcon: "🍔",
        subject: "Your Swiggy order is confirmed",
        date: d(1),
        estimatedCo2: 5.5,
        needsReview: false,
      },
      {
        id: "d3",
        platform: "Blinkit",
        category: "quick_commerce",
        categoryLabel: "Quick Commerce",
        categoryIcon: "⚡",
        subject: "Your Blinkit order is out for delivery!",
        date: d(1),
        estimatedCo2: 3.8,
        needsReview: false,
      },
      {
        id: "d4",
        platform: "Uber",
        category: "transport_cab",
        categoryLabel: "Cab Ride",
        categoryIcon: "🚕",
        subject: "Your Uber receipt from Thursday",
        date: d(2),
        estimatedCo2: 3.2,
        needsReview: false,
      },
      {
        id: "d5",
        platform: "Amazon.in",
        category: "ecommerce",
        categoryLabel: "Online Shopping",
        categoryIcon: "📦",
        subject: "Your Amazon.in order has been shipped",
        date: d(2),
        estimatedCo2: 7.5,
        needsReview: false,
      },
      {
        id: "d6",
        platform: "Zepto",
        category: "quick_commerce",
        categoryLabel: "Quick Commerce",
        categoryIcon: "⚡",
        subject: "Zepto: Order delivered in 9 minutes!",
        date: d(3),
        estimatedCo2: 3.8,
        needsReview: false,
      },
      {
        id: "d7",
        platform: "IndiGo",
        category: "flight",
        categoryLabel: "Flight",
        categoryIcon: "✈️",
        subject: "E-ticket for your IndiGo flight DEL→BOM",
        date: d(4),
        estimatedCo2: 180,
        needsReview: true,
      },
      {
        id: "d8",
        platform: "Ola",
        category: "transport_cab",
        categoryLabel: "Cab Ride",
        categoryIcon: "🚕",
        subject: "Thanks for riding with Ola!",
        date: d(4),
        estimatedCo2: 3.2,
        needsReview: false,
      },
      {
        id: "d9",
        platform: "Flipkart",
        category: "ecommerce",
        categoryLabel: "Online Shopping",
        categoryIcon: "📦",
        subject: "Flipkart: Your order #FL-28394 has shipped",
        date: d(5),
        estimatedCo2: 7.5,
        needsReview: false,
      },
      {
        id: "d10",
        platform: "Swiggy",
        category: "food_delivery",
        categoryLabel: "Food Delivery",
        categoryIcon: "🍔",
        subject: "Your Swiggy Instamart order is delivered",
        date: d(5),
        estimatedCo2: 5.5,
        needsReview: false,
      },
      {
        id: "d11",
        platform: "BESCOM",
        category: "electricity",
        categoryLabel: "Electricity Bill",
        categoryIcon: "💡",
        subject: "BESCOM: Your November electricity bill is ready",
        date: d(6),
        estimatedCo2: null,
        needsReview: true,
      },
      {
        id: "d12",
        platform: "MakeMyTrip",
        category: "travel",
        categoryLabel: "Travel Booking",
        categoryIcon: "🗺️",
        subject: "Your hotel booking at Goa is confirmed!",
        date: d(6),
        estimatedCo2: 15,
        needsReview: false,
      },
      {
        id: "d13",
        platform: "Zomato",
        category: "food_delivery",
        categoryLabel: "Food Delivery",
        categoryIcon: "🍔",
        subject: "Zomato: Your order from Burger King is confirmed",
        date: d(7),
        estimatedCo2: 5.5,
        needsReview: false,
      },
      {
        id: "d14",
        platform: "IRCTC",
        category: "transport_train",
        categoryLabel: "Train Journey",
        categoryIcon: "🚂",
        subject: "E-ticket for your IRCTC booking PNR: 1234567890",
        date: d(7),
        estimatedCo2: 0.8,
        needsReview: false,
      },
    ];
  }

  return { sync, CATEGORY_DEFAULTS };
})();

window.GmailParser = GmailParser;
