import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  bookId: { type: Number, required: true }, // מקשר ל-SQL Book
  userId: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Review = mongoose.model("Review", reviewSchema);
