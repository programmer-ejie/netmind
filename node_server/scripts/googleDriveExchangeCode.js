const { google } = require("googleapis");
require("dotenv").config({ quiet: true });
const { getGoogleRedirectUri } = require("../utils/googleOAuthConfig");

const code = process.argv[2];
const redirectUri = getGoogleRedirectUri();

const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

if (!code) {
  console.error("Usage:");
  console.error("  npm.cmd run drive:exchange-code -- YOUR_GOOGLE_CODE");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

console.log(`Using redirect URI: ${redirectUri}`);

oauth2Client
  .getToken(code)
  .then(({ tokens }) => {
    if (!tokens.refresh_token) {
      console.error("No refresh token returned.");
      console.error("Run drive:auth-url again and approve with prompt=consent.");
      process.exit(1);
    }

    console.log("Add this to node_server/.env:");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  })
  .catch((err) => {
    console.error("Failed to exchange code.");
    console.error(`Error message: ${err.message}`);
    if (err.response?.data) {
      console.error(`Google response: ${JSON.stringify(err.response.data)}`);
    }
    process.exit(1);
  });
