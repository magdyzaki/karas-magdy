const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");

router.post("/", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }
    const url = "/uploads/" + req.file.filename;
    res.status(200).json({
      success: true,
      url,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
