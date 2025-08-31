// import { topBooks } from "../controllers/statsController.js";

// export default async function statsRoutes(fastify) {
//   fastify.get("/top-books", topBooks);
// }
// server/src/routes/statsRoutes.js
// server/src/routes/statsRoutes.js
// server/src/routes/statsRoutes.js
// server/src/routes/statsRoutes.js
import { Sequelize } from "sequelize";
import { Loan } from "../modules/loansModule.js";
import { Book } from "../modules/booksModule.js";
import { redis } from "../config/redis.js";

const KEY = "cache:top10:books";
const TTL = Number(process.env.TOP10_TTL || 300);

export default async function statsRoutes(app) {
  app.get("/stats/top-books", async (req, reply) => {
    try {
      // ניקוי יזום: /stats/top-books?nocache=1
      if (req.query?.nocache === "1") {
        try { await redis?.del(KEY); } catch {}
      }

      // ניסיון להביא מה-cache
      try {
        const cached = await redis?.get(KEY);
        if (cached) {
          reply.header("x-cache", "hit");
          return reply.send(JSON.parse(cached)); // כבר בפורמט Flat
        }
      } catch {}

      // שליפה מה-DB: COUNT(Loan.id) לפי bookId
      const rows = await Loan.findAll({
        attributes: [
          "bookId",
          [Sequelize.fn("COUNT", Sequelize.col("Loan.id")), "loanCount"],
        ],
        include: [{ model: Book, attributes: ["id", "title", "author", "fileUrl"] }],
        group: ["Loan.bookId", "Book.id"],
        order: [[Sequelize.literal("loanCount"), "DESC"]],
        limit: 10,
      });

      // החזרת מבנה FLAT שה-UI מצפה לו:
      //  id, title, author, fileUrl, loanCount  (+compat fields bookId, book)
      const items = rows.map((r) => {
        const count = Number(r.get("loanCount") ?? 0);
        if (r.Book) {
          return {
            // *** מה שה-UI צריך בטופ-לבל ***
            id: r.Book.id,
            title: r.Book.title,
            author: r.Book.author,
            fileUrl: r.Book.fileUrl,
            loanCount: count,
            // *** תאימות לאחור למי שקורא book.title ***
            bookId: r.bookId,
            book: {
              id: r.Book.id,
              title: r.Book.title,
              author: r.Book.author,
              fileUrl: r.Book.fileUrl,
            },
          };
        }
        // אם אין Book (נדיר), עדיין נחזיר אובייקט תקין
        return {
          id: r.bookId,
          title: "(unknown)",
          author: "",
          fileUrl: "",
          loanCount: count,
          bookId: r.bookId,
          book: null,
        };
      });

      // שמירה ל-Redis
      try { await redis?.set(KEY, JSON.stringify(items), { EX: TTL }); } catch {}
      reply.header("x-cache", "miss");
      return reply.send(items);
    } catch (err) {
      req.log?.error({ err }, "top-books failed");
      return reply.code(500).send({ error: "Top books failed", details: err.message });
    }
  });
}
