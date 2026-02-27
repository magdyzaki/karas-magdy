const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const uploadMw = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE"
        ? "الملف كبير جداً (الحد 25 ميجا)"
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? "اسم حقل الملف غير صحيح"
        : err.message || "خطأ في رفع الملف";
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

router.post("/", protect, uploadMw, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const isProd = process.env.NODE_ENV === "production";
    if (isProd && !isCloudinaryConfigured) {
      return res.status(503).json({
        success: false,
        message: "رفع الصور غير مفعّل. أضف CLOUDINARY_CLOUD_NAME و API_KEY و API_SECRET في Render.",
      });
    }

    let url;

    if (isCloudinaryConfigured && req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "karas-magdy", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        uploadStream.end(req.file.buffer);
      });
      url = result.secure_url;
    } else {
      url = "/uploads/" + req.file.filename;
    }

    res.status(200).json({
      success: true,
      url,
      filename: req.file.filename || req.file.originalname,
    });
  } catch (error) {
    const msg = error.message || "خطأ في الرفع";
    const cloudMsg = String(msg).toLowerCase().includes("cloudinary")
      ? "تأكد من إعداد CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET في Render"
      : msg;
    res.status(500).json({
      success: false,
      message: cloudMsg,
    });
  }
});

module.exports = router;
