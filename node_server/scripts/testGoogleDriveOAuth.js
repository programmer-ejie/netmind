const { google } = require("googleapis");
const { Readable } = require("stream");
require("dotenv").config({ quiet: true });
const { getGoogleRedirectUri } = require("../utils/googleOAuthConfig");

const redirectUri = getGoogleRedirectUri();

async function main() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_FOLDER_ID",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log("OAuth env: ok");
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Folder ID suffix: ...${folderId.slice(-8)}`);

  const folder = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType,capabilities/canAddChildren",
    supportsAllDrives: true,
  });

  console.log(`Folder: ${folder.data.name}`);
  console.log(`Folder type: ${folder.data.mimeType}`);
  console.log(`Can add children: ${folder.data.capabilities?.canAddChildren}`);

  const created = await drive.files.create({
    requestBody: {
      name: `netmind-oauth-drive-test-${Date.now()}.txt`,
      parents: [folderId],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(["NetMind Google Drive OAuth storage test"]),
    },
    fields: "id,name",
    supportsAllDrives: true,
  });

  console.log(`Uploaded: ${created.data.name}`);
  console.log(`Uploaded file ID suffix: ...${created.data.id.slice(-8)}`);

  await drive.files.delete({
    fileId: created.data.id,
    supportsAllDrives: true,
  });

  console.log("Deleted test file: ok");
  console.log("Google Drive OAuth storage test: PASS");
}

main().catch((err) => {
  console.error("Google Drive OAuth storage test: FAIL");
  console.error(`Error code: ${err.code || "n/a"}`);
  console.error(`Error message: ${err.message}`);
  if (err.errors?.length) {
    console.error(`Google reason: ${err.errors.map((error) => error.reason).join(", ")}`);
  }
  process.exit(1);
});
