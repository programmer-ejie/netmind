const { google } = require("googleapis");
const { Readable } = require("stream");

function getOAuthDriveClient() {
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_REDIRECT_URI"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Google Drive OAuth env: ${missing.join(", ")}`);
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth });
}

function getServiceAccountDriveClient() {
  const required = ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Google Drive service account env: ${missing.join(", ")}`);
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

function getDriveClient() {
  if (process.env.GOOGLE_DRIVE_AUTH_MODE === "service_account") {
    return getServiceAccountDriveClient();
  }

  return getOAuthDriveClient();
}

async function uploadBufferToDrive({ buffer, fileName, mimeType, folderId }) {
  if (!folderId) {
    throw new Error("Missing Google Drive folder ID");
  }

  const drive = getDriveClient();
  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink,webContentLink,thumbnailLink",
    supportsAllDrives: true,
  });

  await drive.permissions.create({
    fileId: created.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  return {
    fileId: created.data.id,
    name: created.data.name,
    webViewLink: created.data.webViewLink,
    webContentLink: created.data.webContentLink,
    thumbnailLink: created.data.thumbnailLink,
    directUrl: created.data.thumbnailLink || `https://drive.google.com/thumbnail?id=${created.data.id}&sz=w1000`,
  };
}

module.exports = {
  getDriveClient,
  uploadBufferToDrive,
};
