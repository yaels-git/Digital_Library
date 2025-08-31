// routes/booksRoutes.js
// import {
//   getAllBooks,
//   getBookById,
//   createBook,
//   updateBook,
//   deleteBook,
// } from "../controllers/booksController.js";

// export default async function booksRoutes(fastify) {
//   fastify.get("/", getAllBooks);
//   fastify.get("/:id", getBookById);
//   fastify.post("/", createBook);
//   fastify.put("/:id", updateBook);
//   fastify.delete("/:id", deleteBook);
// }
// server/src/routes/booksRoutes.js
// server/src/routes/booksRoutes.js
// server/src/routes/booksRoutes.js
// server/src/routes/booksRoutes.js
import { Sequelize, Op } from "sequelize";
import { Book } from "../modules/booksModule.js";
import { Loan } from "../modules/loansModule.js";

/** מפענח מיון: title | author | recent | popular (+ sort=-title, dir=desc) */
function parseSort(query) {
  let raw = (query?.sort ?? "title").toString().trim();
  let dir = (query?.dir ?? "asc").toString().toLowerCase();
  if (raw.startsWith("-")) { dir = "desc"; raw = raw.slice(1); }
  const s = raw.toLowerCase();
  const synonyms = {
    title:   ["title","name","az","za","bytitle"],
    author:  ["author","byauthor","writer"],
    recent:  ["recent","new","created","latest","date"],
    popular: ["popular","top","top10","hot"],
  };
  let key = "title";
  for (const [k, arr] of Object.entries(synonyms)) if (k===s || arr.includes(s)) key = k;
  if (s === "za") dir = "desc";
  return { key, dir };
}

/** מפענח בוליאן מסטרינג: true/1/yes/on */
function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["1","true","yes","on"].includes(s)) return true;
  if (["0","false","no","off"].includes(s)) return false;
  return undefined;
}

export default async function booksRoutes(app) {
  // רשימת ספרים עם מיונים + חיפוש + סינון זמינות
  // תומך בפרמטרים:
  //  ?sort=title|author|recent|popular  (&dir=asc|desc או sort=-title)
  //  ?q= / ?search=
  //  ?available=true|false  או  ?onlyAvailable=1 / ?availableOnly=1
  app.get("/books", async (req, reply) => {
    try {
      const { key, dir } = parseSort(req.query);

      // --- חיפוש טקסט חופשי ---
      const q = req.query?.q ?? req.query?.search;

      // --- סינון זמינות ---
      // אם onlyAvailable/availableOnly true ⇒ available=true
      // אחרת אם available סופק (true/false) ⇒ בהתאם
      let availFilter = parseBool(req.query?.available);
      const onlyAvailable = parseBool(req.query?.onlyAvailable) ?? parseBool(req.query?.availableOnly);
      if (onlyAvailable === true) availFilter = true;

      const where = {};
      if (q) {
        where[Op.or] = [
          { title:  { [Op.like]: `%${q}%` } },
          { author: { [Op.like]: `%${q}%` } },
        ];
      }
      if (availFilter !== undefined) {
        where.available = !!availFilter;
      }

      if (key === "popular") {
        // מיון פופולריות: LEFT JOIN ל-Loans + COUNT, כולל where (חיפוש + זמינות)
        const rows = await Book.findAll({
          where,
          attributes: {
            include: [[Sequelize.fn("COUNT", Sequelize.col("Loans.id")), "loanCount"]],
          },
          include: [{ model: Loan, attributes: [], required: false }],
          group: ["Book.id"],
          order: [
            [Sequelize.literal("loanCount"), "DESC"],
            ["title", "ASC"],
          ],
        });
        return reply.send(rows);
      }

      // מיונים רגילים
      const order =
        key === "author" ? [["author", dir === "desc" ? "DESC" : "ASC"]]
      : key === "recent" ? [["createdAt", "DESC"]] // recent תמיד יורד
      : [["title", dir === "desc" ? "DESC" : "ASC"]];

      const rows = await Book.findAll({
        where,
        order,
        attributes: ["id","title","author","fileUrl","available","createdAt","updatedAt"],
      });

      return reply.send(rows);
    } catch (err) {
      req.log?.error({ err, query: req.query }, "books list failed");
      return reply.code(500).send({ error: "Books query failed", details: err.message });
    }
  });

  // הוספת ספר (seed)
  app.post("/books", async (req, reply) => {
    try {
      const { title, author, fileUrl, available = true } = req.body ?? {};
      if (!title || !author || !fileUrl) {
        return reply.code(400).send({ error: "title, author, fileUrl are required" });
      }
      const created = await Book.create({ title, author, fileUrl, available: !!available });
      return reply.send({ ok: true, id: created.id });
    } catch (err) {
      req.log?.error({ err, body: req.body }, "book create failed");
      return reply.code(500).send({ error: "Create book failed", details: err.message });
    }
  });
}
