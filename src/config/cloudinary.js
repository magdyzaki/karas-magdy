const cloudinary = require("cloudinary").v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured = CLOUD_NAME && API_KEY && API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

module.exports = { cloudinary, isCloudinaryConfigured: !!isConfigured };
