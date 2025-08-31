// // routes/reviewsRoutes.js
// import { addReview, getReviewsForBook } from "../controllers/reviewsController.js";

// export default async function reviewsRoutes(fastify) {
//   fastify.post("/", addReview);
//   fastify.get("/:bookId", getReviewsForBook);
// }
import { addReview, getReviews } from "../modules/reviewsModule.js";

export default async function reviewsRoutes(app) {
  app.get("/reviews", async (req, reply) => {
    const { bookId } = req.query ?? {};
    if (!bookId) return reply.code(400).send({ error: "bookId required" });
    const items = await getReviews(bookId);
    reply.send(items);
  });

  app.post("/reviews", async (req, reply) => {
    const userId = (req.headers["x-user-id"] ?? req.body?.userId ?? "dev-1").toString();
    const { bookId, rating, text } = req.body ?? {};
    if (!bookId || !rating) return reply.code(400).send({ error: "bookId,rating required" });
    const r = await addReview({ bookId, userId, rating, text });
    reply.send({ ok: true, id: r._id });
  });
}
