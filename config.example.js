// ============================================================
// EcoMind — API Configuration Template
// ============================================================
// 1. Copy this file to config.js
// 2. Fill in your keys from Google Cloud Console
// 3. config.js is gitignored — NEVER commit real keys
//
// Google Cloud Setup:
//   https://console.cloud.google.com/
//   Enable: Gmail API, Maps JavaScript API, Gemini API
//   OAuth: Add your domain to Authorized JavaScript Origins
// ============================================================

const ECOMIND_CONFIG = {
  // Google OAuth 2.0 Client ID
  // console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",

  // Gemini API Key
  // aistudio.google.com → Get API Key
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY",

  // Google Maps JavaScript API Key
  // console.cloud.google.com → APIs & Services → Credentials → API Keys
  MAPS_API_KEY: "YOUR_MAPS_API_KEY",

  // App Settings
  APP_VERSION: "1.0.0",
  DEMO_MODE: false, // Set true to run with mock data (no API keys needed)
};

// Make available globally
window.ECOMIND_CONFIG = ECOMIND_CONFIG;
