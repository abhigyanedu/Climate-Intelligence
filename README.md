# EcoMind — Personal Carbon Intelligence Platform

> Track, understand, and reduce your carbon footprint using your real digital data.

## 🌍 Chosen Vertical
**Challenge 3** — Individual carbon footprint understanding, tracking, and reduction through personalized AI insights.

---

## 🧠 Approach & Logic

EcoMind passively collects carbon data from a user's existing digital life — no manual input required. It connects to Google services the user already uses, applies a precise carbon calculation engine, and uses Gemini AI to generate personalized, actionable insights.

### Data Sources

| Source | What We Extract | Carbon Signal |
|--------|----------------|---------------|
| **Gmail API** | Food delivery, flight bookings, e-commerce, electricity bills | Delivery vehicle, flight km, shipping, kWh |
| **Google Maps API** | Route distance + transport mode | Emission factor × distance |
| **Gemini Vision** | Receipt photos, electricity bill images | Product categories, kWh units |
| **Manual Entry** | Appliance usage, screen time, AC hours | Watt-hour calculations |

### Carbon Calculation Engine

All calculations use peer-reviewed emission factors:
- **Transport**: kg CO₂/km by mode (IPCC 2023 data)
- **Electricity**: India grid factor 0.82 kg CO₂/kWh (CEA 2023); 17 global regions supported
- **Food Delivery**: Vehicle + packaging + food type emission chain
- **Flights**: Distance × class × Radiative Forcing Index (RFI = 1.9)
- **E-Commerce**: Product category manufacturing + shipping distance carbon
- **Digital**: Server-side carbon per app category (streaming, AI, social)

### AI Intelligence (Gemini)

- **Receipt/Bill OCR**: Upload photo → Gemini extracts structured data → auto-logged
- **Weekly AI Summary**: Gemini analyzes patterns and generates personalized 3-point insight
- **Smart Goals**: AI suggests achievable 30-day reduction targets based on actual usage
- **Anomaly Detection**: Flags unusual spikes ("You flew twice this month — that's 78% of your carbon")

---

## 🚀 How to Run

### Option 1: Demo Mode (No API Keys)
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/eco-mind.git
cd eco-mind

# Copy config template
cp config.example.js config.js

# Set DEMO_MODE: true in config.js, then open:
open index.html
```

### Option 2: Full Mode (With Google APIs)

1. **Google Cloud Console** → Create Project → Enable these APIs:
   - Gmail API
   - Maps JavaScript API  
   - Gemini API (via Google AI Studio)

2. **OAuth 2.0 Setup**:
   - Create OAuth 2.0 Client ID (Web application type)
   - Add your domain to Authorized JavaScript Origins
   - For GitHub Pages: `https://YOUR_USERNAME.github.io`

3. **Configure**:
```bash
cp config.example.js config.js
# Edit config.js with your keys
```

4. **Deploy to GitHub Pages**:
   - Push to `main` branch
   - Go to repo Settings → Pages → Source: main branch
   - Access at `https://YOUR_USERNAME.github.io/eco-mind`

---

## 📁 Project Structure

```
eco-mind/
├── index.html              # SPA shell
├── config.example.js       # Key template (committed)
├── config.js               # Actual keys (gitignored)
├── css/
│   └── styles.css          # Design system + animations
├── js/
│   ├── app.js              # Main controller + router
│   ├── auth.js             # Google OAuth (GIS library)
│   ├── carbon-engine.js    # All CO₂ calculation logic
│   ├── gmail-parser.js     # Gmail API + email pattern matching
│   ├── gemini-client.js    # Gemini API (vision + text)
│   ├── maps-carbon.js      # Google Maps + route carbon
│   ├── ai-advisor.js       # Insight generation engine
│   ├── storage.js          # localStorage/IndexedDB
│   └── charts.js           # Chart.js visualizations
└── tests/
    └── carbon-engine.test.js
```

---

## 🌏 India-First, Global-Ready

Default configuration targets India:
- Email patterns: Zomato, Swiggy, Blinkit, Zepto, Flipkart, Amazon.in, IndiGo, Air India, IRCTC, Ola, Uber India
- Grid factor: 0.82 kg CO₂/kWh (CEA 2023)
- Currency: INR

Toggle to global mode in Settings → supports 17 regions including US, EU, UK, Australia, Singapore.

---

## 🔒 Security

- OAuth tokens stored in memory only (not localStorage)
- Gmail access is **read-only** (`gmail.readonly` scope)
- API keys are never committed (config.js is gitignored)
- All processing is client-side — no user data sent to any server except Google/Gemini APIs
- Content Security Policy headers configured

---

## ♿ Accessibility

- WCAG 2.1 AA compliant color contrast ratios
- Full keyboard navigation
- ARIA labels on all interactive elements
- Screen reader compatible chart descriptions
- Responsive design (mobile, tablet, desktop)

---

## 🧪 Testing

```bash
# Run carbon calculation unit tests (Node.js required)
node tests/carbon-engine.test.js
```

Tests cover: emission factor accuracy, edge cases (zero distance, international flights), electricity unit conversion, and food delivery carbon chain.

---

## Assumptions

1. India electricity grid factor from CEA 2023 Annual Report (0.82 kg CO₂/kWh)
2. Flight emission factors include Radiative Forcing Index (RFI = 1.9) per DEFRA 2023
3. Food delivery assumes average 5km delivery distance on a motorcycle
4. Quick commerce (Blinkit/Zepto) carries +0.8 kg CO₂ premium for cold chain logistics
5. E-commerce shipping from international origin adds 8 kg CO₂ per order (air freight estimate)
6. AI app server carbon uses 0.005 kg CO₂/query estimate (published ML carbon literature)

---

## Built With

- **Frontend**: HTML5, Vanilla JS (ES6 modules), CSS3
- **AI**: Google Gemini Flash (vision + text generation)
- **Data**: Gmail API, Google Maps JavaScript API
- **Auth**: Google Identity Services (GIS)
- **Charts**: Chart.js
- **Storage**: localStorage + IndexedDB (offline-first)

---

*Built for the Carbon Intelligence Challenge — EcoMind helps real people make real changes.*
