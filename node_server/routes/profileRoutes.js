const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getDriveClient, uploadBufferToDrive } = require("../utils/googleDriveStorage");
const { canAccessTeam, isSelf } = require("../middleware/authorization");
const {
  createNotifications,
  getPlayerStaffRecipients,
  getActorNetworkRecipients,
} = require("../src/services/notificationService");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Uploaded file must be an image"));
      return;
    }

    callback(null, true);
  },
});

async function convertImageToWebp(file, { maxSize = 1200, quality = 82 } = {}) {
  try {
    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

    return {
      buffer,
      extension: "webp",
      mimeType: "image/webp",
    };
  } catch {
    throw new ApiError(400, "Uploaded file must be a valid image");
  }
}

router.post(
  "/users/:id/profile-picture",
  asyncHandler(async (req, res, next) => {
    if (!isSelf(req.user, req.params.id)) {
      throw new ApiError(403, "You can only update your own profile picture");
    }

    next();
  }),
  upload.single("profile_picture"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Profile picture file is required");
    }

    const users = await query("SELECT id, name FROM users WHERE id = ?", [req.params.id]);
    if (!users.length) {
      throw new ApiError(404, "User not found");
    }

    const image = await convertImageToWebp(req.file, { maxSize: 900, quality: 82 });
    const safeName = users[0].name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "profile";
    const uploaded = await uploadBufferToDrive({
      buffer: image.buffer,
      fileName: `${safeName}-${Date.now()}.${image.extension}`,
      mimeType: image.mimeType,
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
    const user = rows[0];

    if (["trainer", "player"].includes(user.role)) {
      const recipientIds = user.role === "player"
        ? [user.id, ...(await getPlayerStaffRecipients(user.id))]
        : [user.id, ...(await getActorNetworkRecipients(req.user))];
      await createNotifications({
        actorId: req.user.id,
        recipientIds,
        type: "account.profile_picture.updated",
        title: "Profile picture updated",
        body: `${req.user.name} updated a profile picture.`,
        data: {
          userId: user.id,
          role: user.role,
        },
      });
    }

    res.json({
      user,
      file: uploaded,
    });
  })
);

router.post(
  "/teams/:id/logo",
  asyncHandler(async (req, res, next) => {
    if (req.user.role === "player" || !(await canAccessTeam(req.user, req.params.id))) {
      throw new ApiError(403, "You do not have permission to update this team logo");
    }

    next();
  }),
  upload.single("team_logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Team logo file is required");
    }

    const teams = await query("SELECT id, team_name FROM teams WHERE id = ?", [req.params.id]);
    if (!teams.length) {
      throw new ApiError(404, "Team not found");
    }

    const image = await convertImageToWebp(req.file, { maxSize: 1200, quality: 84 });
    const safeName = teams[0].team_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "team-logo";
    const uploaded = await uploadBufferToDrive({
      buffer: image.buffer,
      fileName: `${safeName}-logo-${Date.now()}.${image.extension}`,
      mimeType: image.mimeType,
      folderId: process.env.GOOGLE_DRIVE_TEAMLOGO_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID,
    });

    await query(
      "UPDATE teams SET logo_url = ?, team_logo_file_id = ? WHERE id = ?",
      [uploaded.directUrl, uploaded.fileId, req.params.id]
    );

    const rows = await query("SELECT * FROM teams WHERE id = ?", [req.params.id]);

    res.json({
      team: rows[0],
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

router.get(
  "/team-logos/:fileId",
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
