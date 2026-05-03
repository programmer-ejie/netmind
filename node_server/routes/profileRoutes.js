const express = require("express");
const multer = require("multer");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getDriveClient, uploadBufferToDrive } = require("../utils/googleDriveStorage");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Profile picture must be an image"));
      return;
    }

    callback(null, true);
  },
});

router.post(
  "/users/:id/profile-picture",
  upload.single("profile_picture"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Profile picture file is required");
    }

    const users = await query("SELECT id, name FROM users WHERE id = ?", [req.params.id]);
    if (!users.length) {
      throw new ApiError(404, "User not found");
    }

    const extension = req.file.originalname.split(".").pop() || "jpg";
    const safeName = users[0].name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "profile";
    const uploaded = await uploadBufferToDrive({
      buffer: req.file.buffer,
      fileName: `${safeName}-${Date.now()}.${extension}`,
      mimeType: req.file.mimetype,
      folderId: process.env.GOOGLE_DRIVE_PROFILE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID,
    });

    await query(
      "UPDATE users SET profile_picture_url = ?, profile_picture_file_id = ? WHERE id = ?",
      [uploaded.directUrl, uploaded.fileId, req.params.id]
    );

    const rows = await query(
      "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
      [req.params.id]
    );

    res.json({
      user: rows[0],
      file: uploaded,
    });
  })
);

router.get(
  "/profile-pictures/:fileId",
  asyncHandler(async (req, res) => {
    const drive = getDriveClient();
    const metadata = await drive.files.get({
      fileId: req.params.fileId,
      fields: "name,mimeType",
      supportsAllDrives: true,
    });
    const file = await drive.files.get(
      {
        fileId: req.params.fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", metadata.data.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=300");
    file.data.pipe(res);
  })
);

module.exports = router;
