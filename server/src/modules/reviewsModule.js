
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookId: { type: Number, required: true },
    userId: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "reviews" }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export async function addReview({ bookId, userId, rating, text }) {
  return Review.create({ bookId, userId: String(userId), rating, text });
}

export async function getReviews(bookId) {
  return Review.find({ bookId: Number(bookId) }).sort({ createdAt: -1 }).lean();
}
