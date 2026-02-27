const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      default: "New User",
    },
    profileImage: {
      type: String,
      default: "",
    },
    about: {
      type: String,
      default: "Hey there! I am using WhatsApp Clone.",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pinnedConversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
    archivedConversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
    starredMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    mutedConversations: [{
      conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
      mutedUntil: { type: Date, default: null },
    }],
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "system" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
