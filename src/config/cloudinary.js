const cloudinary = require("cloudinary").v2;

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured = CLOUDINARY_URL || (CLOUD_NAME && API_KEY && API_SECRET);

if (CLOUDINARY_URL) {
  cloudinary.config();
} else if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

module.exports = { cloudinary, isCloudinaryConfigured: !!isConfigured };
