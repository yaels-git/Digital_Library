import mongoose from "mongoose";
import "dotenv/config";

export async function initMongo() {
  const url = process.env.MONGO_URL || "mongodb://localhost:27017";
  const dbName = process.env.MONGO_DB || "diglib";
  try {
    await mongoose.connect(url, { dbName });
    console.log("✅ Mongo connected", { url, dbName });
  } catch (err) {
    console.warn("⚠️ Mongo disabled:", err.message);
  }
}
