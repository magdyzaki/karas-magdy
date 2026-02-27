const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "voice", "file", "location", "gif", "poll"],
      default: "text",
    },
    content: {
      type: String,
      default: "",
    },
    // للرسائل من نوع صورة/فيديو/ملف
    mediaUrl: {
      type: String,
      default: "",
    },
    // للرد على رسالة
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // إعادة التوجيه
    isForwarded: { type: Boolean, default: false },
    forwardedFromName: { type: String, default: "" },
    // من قرأ الرسالة (للمحادثات الثنائية)
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // حذف من عندي: المستخدمون الذين أخفوها
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // حذف للجميع
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    // التفاعلات: [{ emoji, userId }] — كل مستخدم تفاعل واحد
    reactions: {
      type: [{ emoji: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
      default: [],
    },
    // للاستطلاعات: { options: ["خيار1","خيار2"], votes: [{ optionIndex: 0, userId }] }
    pollData: {
      options: [String],
      votes: [{ optionIndex: Number, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة لتحسين البحث والسحب بالتاريخ
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
