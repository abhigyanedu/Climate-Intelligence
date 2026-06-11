const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        CarbonEngine: "readonly",
        Storage: "readonly",
        Auth: "readonly",
        GmailParser: "readonly",
        GeminiClient: "readonly",
        Charts: "readonly",
        lucide: "readonly",
        initializeApp: "readonly",
        getAnalytics: "readonly",
        logEvent: "readonly",
        MapsCarbon: "readonly",
        Chart: "readonly"
      },
      ecmaVersion: "latest",
      sourceType: "script"
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      "no-redeclare": "off"
    }
  }
];
