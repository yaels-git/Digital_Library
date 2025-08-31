import * as reviewsModule from "../modules/reviewsModule.js";

export const addReview = async (req, reply) => {
  try {
    const { bookId, userId, rating, comment } = req.body;
    const review = await reviewsModule.addReview({ bookId, userId, rating, comment });
    reply.code(201).send(review);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};

export const getReviewsForBook = async (req, reply) => {
  try {
    const { bookId } = req.params;
    const reviews = await reviewsModule.getReviewsForBook(bookId);
    reply.send(reviews);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};
