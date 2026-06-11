/**
 * EcoMind — Google Auth Module
 * =============================
 * Uses Google Identity Services (GIS) for OAuth 2.0.
 * Supports scopes: Gmail read-only, user profile.
 */

const Auth = (() => {
  const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  let _tokenClient = null;
  let _accessToken = null;
  let _userProfile = null;
  let _onAuthCallback = null;

  /**
   * Initialize the Google Identity Services token client.
   * Must be called after the GIS script has loaded.
   */
  function init(onAuthSuccess) {
    _onAuthCallback = onAuthSuccess;

    const cfg = window.ECOMIND_CONFIG;
    if (!cfg || cfg.DEMO_MODE) {
      console.info("[Auth] Demo mode — skipping GIS init");
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      console.warn("[Auth] GIS not loaded yet, will initialize on sign in");
      return;
    }

    _initTokenClient(cfg);
  }

  function _initTokenClient(cfg) {
    if (_tokenClient) return true;
    if (!window.google?.accounts?.oauth2) return false;
    
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: cfg.GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: _handleTokenResponse,
    });
    return true;
  }

  /**
   * Trigger the OAuth popup flow.
   */
  function signIn() {
    const cfg = window.ECOMIND_CONFIG;

    // Demo mode — inject fake user
    if (!cfg || cfg.DEMO_MODE) {
      _simulateDemoLogin();
      return;
    }

    if (!_tokenClient) {
      if (!_initTokenClient(cfg)) {
        console.error("[Auth] GIS script still not loaded or blocked by browser.");
        return;
      }
    }

    _tokenClient.requestAccessToken({ prompt: "consent" });
  }

  /**
   * Sign out — revoke token and clear state.
   */
  function signOut() {
    if (_accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(_accessToken, () => {
        console.info("[Auth] Token revoked");
      });
    }
    _accessToken = null;
    _userProfile = null;
    Storage.clear();
    window.dispatchEvent(new CustomEvent("ecomind:signout"));
  }

  /**
   * Get current access token (null if not signed in).
   */
  function getAccessToken() {
    return _accessToken;
  }

  /**
   * Get user profile info.
   */
  function getUser() {
    return _userProfile;
  }

  /**
   * Check if user is currently signed in.
   */
  function isSignedIn() {
    return !!_accessToken;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────────

  async function _handleTokenResponse(response) {
    if (response.error) {
      console.error("[Auth] OAuth error:", response.error);
      return;
    }

    _accessToken = response.access_token;
    await _fetchUserProfile();

    if (_onAuthCallback) {
      _onAuthCallback(_userProfile);
    }
  }

  async function _fetchUserProfile() {
    try {
      const res = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${_accessToken}` } }
      );
      _userProfile = await res.json();
      console.info("[Auth] Signed in as:", _userProfile.email);
    } catch (e) {
      console.error("[Auth] Failed to fetch profile:", e);
    }
  }

  function _simulateDemoLogin() {
    _accessToken = "DEMO_TOKEN";
    _userProfile = {
      id: "demo_user",
      name: "Demo User",
      email: "demo@ecomind.app",
      picture: null,
      isDemoUser: true,
    };
    setTimeout(() => {
      if (_onAuthCallback) _onAuthCallback(_userProfile);
    }, 500);
  }

  return { init, signIn, signOut, getAccessToken, getUser, isSignedIn };
})();

window.Auth = Auth;
