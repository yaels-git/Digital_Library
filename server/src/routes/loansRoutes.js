// routes/loansRoutes.js
// import {
//   borrowBook,
//   returnBook,
//   myLoans,
// } from "../controllers/loansController.js";

// export default async function loansRoutes(fastify) {
//   fastify.post("/borrow", borrowBook);
//   fastify.post("/return", returnBook);
//   fastify.get("/my", myLoans);
// }
// server/src/routes/loansRoutes.js
// server/src/routes/loansRoutes.js
// server/src/routes/loansRoutes.js

import { borrowBook, returnBook, getUserLoans } from "../modules/loansModule.js";
import { redis } from "../config/redis.js";           // ← הוספה
const TOP10_KEY = "cache:top10:books";                 // ← הוספה

export default async function loansRoutes(app) {
  // השאלת ספר
  app.post("/loans/borrow", async (req, reply) => {
    const userId = (req.headers["x-user-id"] ?? req.body?.userId ?? "dev-1").toString();
    const { bookId, days } = req.body ?? {};
    if (!bookId) return reply.code(400).send({ error: "bookId required" });

    try {
      const loan = await borrowBook(Number(bookId), userId, Number(days) || 7);
      if (!loan) return reply.code(409).send({ error: "Book not available" });

      // ← פסילת cache של Top-10 אחרי השאלה מוצלחת
      try { await redis?.del(TOP10_KEY); } catch {}

      return reply.send({ ok: true, loanId: loan.id });
    } catch (err) {
      req.log?.error({ err }, "borrow failed");
      return reply.code(500).send({ error: "Borrow failed", details: err.message });
    }
  });

  // ההשאלות שלי — מחזיר *מערך* ישירות (לא { ok, items })
  app.get("/loans/my", async (req, reply) => {
    const userId = (req.headers["x-user-id"] ?? req.query.userId ?? "dev-1").toString();
    try {
      const items = await getUserLoans(userId);
      return reply.send(items); // מחזיר array כדי ש-React יוכל לעשות .filter
    } catch (err) {
      req.log?.error({ err }, "loans/my failed");
      return reply.code(500).send({ error: "Loans query failed", details: err.message });
    }
  });

  // החזרת ספר
  app.post("/loans/return", async (req, reply) => {
    const userId = (req.headers["x-user-id"] ?? req.body?.userId ?? "dev-1").toString();
    const { loanId } = req.body ?? {};
    if (!loanId) return reply.code(400).send({ error: "loanId required" });

    try {
      const loan = await returnBook(Number(loanId));

      // ← פסילת cache של Top-10 אחרי החזרה מוצלחת
      try { await redis?.del(TOP10_KEY); } catch {}

      return reply.send({ ok: true, loanId: loan?.id, status: loan?.status, userId });
    } catch (err) {
      req.log?.error({ err }, "return failed");
      return reply.code(500).send({ error: "Return failed", details: err.message });
    }
  });
}
