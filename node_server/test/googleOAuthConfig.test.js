const assert = require("node:assert/strict");
const test = require("node:test");
const { getBackendBaseUrl, getGoogleRedirectUri } = require("../utils/googleOAuthConfig");

function withEnv(values, callback) {
  const previous = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("Google OAuth redirect defaults to backend port 5001", () => {
  withEnv({
    BACKEND_BASE_URL: undefined,
    GOOGLE_REDIRECT_URI: undefined,
    PORT: undefined,
  }, () => {
    assert.equal(getBackendBaseUrl(), "http://localhost:5001");
    assert.equal(getGoogleRedirectUri(), "http://localhost:5001/oauth2callback");
  });
});

test("Google OAuth redirect honors explicit backend base URL", () => {
  withEnv({
    BACKEND_BASE_URL: "http://127.0.0.1:5010/",
    GOOGLE_REDIRECT_URI: undefined,
    PORT: "5001",
  }, () => {
    assert.equal(getBackendBaseUrl(), "http://127.0.0.1:5010");
    assert.equal(getGoogleRedirectUri(), "http://127.0.0.1:5010/oauth2callback");
  });
});

test("Google OAuth redirect honors explicit redirect URI", () => {
  withEnv({
    BACKEND_BASE_URL: "http://localhost:5001",
    GOOGLE_REDIRECT_URI: "http://localhost:7777/custom-callback",
    PORT: "5001",
  }, () => {
    assert.equal(getGoogleRedirectUri(), "http://localhost:7777/custom-callback");
  });
});
