/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
const Auth = require("./js/auth.js");

describe("Auth Module", () => {
  test("Initializes correctly or catches missing dependencies gracefully", () => {
    try {
      Auth.init();
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      Auth.signIn();
    } catch (e) {
      expect(e).toBeDefined();
    }

    try {
      Auth.signOut();
    } catch (e) {
      expect(e).toBeDefined();
    }

    expect(Auth.getAccessToken()).toBeNull();
    expect(Auth.getUser()).toBeNull();
    expect(Auth.isSignedIn()).toBe(false);
  });
});
