import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";
import { tableExists, hasColumn } from "../lib/mssqlMeta.js";

export async function topBooks(req, reply) {
  try {
    if (!(await tableExists("Books"))) return reply.send([]);

    const hasPopularity = await hasColumn("Books", "popularity");

    const sql = hasPopularity
      ? `SELECT TOP 10 [id], [title], [author]
           FROM [Books]
          ORDER BY ISNULL([popularity], 0) DESC, [title] ASC`
      : `SELECT TOP 10 [id], [title], [author]
           FROM [Books]
          ORDER BY [title] ASC`;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    return reply.send(rows.map(r => ({ id: r.id, title: r.title, author: r.author })));
  } catch (err) {
    req.log.error({ err }, "topBooks failed");
    return reply.code(500).send({ error: "topBooks failed", detail: err?.message });
  }
}
