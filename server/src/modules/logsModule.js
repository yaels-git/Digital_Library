import mongoose from "mongoose";

// סכמת לוגים
const logSchema = new mongoose.Schema({
  level: { type: String, enum: ["info", "warn", "error"], default: "info" },
  message: { type: String, required: true },
  context: { type: Object }, // מידע נוסף (userId, bookId, loanId וכו')
  createdAt: { type: Date, default: Date.now },
});

// מודל
const Log = mongoose.model("Log", logSchema);

// פונקציות
export const addLog = async ({ level = "info", message, context = {} }) => {
  const log = new Log({ level, message, context });
  return await log.save();
};

export const getLogs = async (limit = 50) => {
  return await Log.find().sort({ createdAt: -1 }).limit(limit);
};
