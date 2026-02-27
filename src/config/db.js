const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = (process.env.MONGO_URI || "").trim();
    if (!uri || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
      throw new Error("MONGO_URI فارغ أو بصيغة خاطئة. تأكد أنه يبدأ بـ mongodb:// أو mongodb+srv://");
    }
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
