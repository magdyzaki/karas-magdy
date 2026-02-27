const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
