const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },
    content: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL - يحذف تلقائياً بعد انتهاء الصلاحية

module.exports = mongoose.model("Story", storySchema);
