function getBackendBaseUrl() {
  if (process.env.BACKEND_BASE_URL) {
    return process.env.BACKEND_BASE_URL.replace(/\/$/, "");
  }

  const port = process.env.PORT || "5001";
  return `http://localhost:${port}`;
}

function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${getBackendBaseUrl()}/oauth2callback`;
}

function getGoogleOAuthScopes() {
  if (process.env.GOOGLE_AUTH_SCOPES) {
    return process.env.GOOGLE_AUTH_SCOPES
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  return [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/gmail.send",
  ];
}

module.exports = {
  getBackendBaseUrl,
  getGoogleRedirectUri,
  getGoogleOAuthScopes,
};
