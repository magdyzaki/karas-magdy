const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isCloudinaryConfigured } = require("../config/cloudinary");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// مع Cloudinary: نستخدم الذاكرة. بدون: نستخدم القرص المحلي
const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".bin";
        const name = Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
        cb(null, name);
      },
    });

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "audio/mpeg",
    "audio/ogg",
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مدعوم"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = { upload, UPLOAD_DIR };
