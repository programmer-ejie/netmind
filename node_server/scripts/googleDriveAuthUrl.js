const { google } = require("googleapis");
require("dotenv").config({ quiet: true });
const { getGoogleRedirectUri } = require("../utils/googleOAuthConfig");

const redirectUri = getGoogleRedirectUri();

const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  console.error("Add the OAuth client values to node_server/.env first.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("Open this URL in your browser:");
console.log(authUrl);
console.log("");
console.log(`Redirect URI used: ${redirectUri}`);
console.log("Make sure this exact URI is authorized in Google Cloud Console.");
console.log("After approving access, copy the 'code' value from the redirected URL.");
