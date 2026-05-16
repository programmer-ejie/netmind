const { Readable } = require("stream");
require("dotenv").config({ quiet: true });

const { getDriveClient } = require("../utils/googleDriveStorage");

async function main() {
  const required = [
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_DRIVE_FOLDER_ID",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log("Service account env: ok");
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
      name: `netmind-service-account-drive-test-${Date.now()}.txt`,
      parents: [folderId],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(["NetMind Google Drive service account storage test"]),
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
  console.log("Google Drive service account storage test: PASS");
}

main().catch((err) => {
  console.error("Google Drive service account storage test: FAIL");
  console.error(`Error code: ${err.code || "n/a"}`);
  console.error(`Error message: ${err.message}`);
  if (err.errors?.length) {
    console.error(`Google reason: ${err.errors.map((error) => error.reason).join(", ")}`);
  }
  process.exit(1);
});
