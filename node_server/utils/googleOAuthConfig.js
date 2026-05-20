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

module.exports = {
  getBackendBaseUrl,
  getGoogleRedirectUri,
};
