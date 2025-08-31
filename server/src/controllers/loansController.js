import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";
import { tableExists, hasColumn } from "../lib/mssqlMeta.js";

const MAX_DAYS = Number(process.env.MAX_LOAN_DAYS || 7);

export async function myLoans(req, reply) {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return reply.code(401).send({ error: "Missing userId" });

    // אם אין טבלת Loans נחזיר ריק (שומר על ה-FE)
    if (!(await tableExists("Loans"))) return reply.send([]);

    const hasBorrowedAt = await hasColumn("Loans", "borrowedAt");
    const hasDueAt      = await hasColumn("Loans", "dueAt");
    const hasStatus     = await hasColumn("Loans", "status");

    const hasFileUrl = await hasColumn("Books", "fileUrl");

    const borrowedExpr = hasBorrowedAt ? "l.[borrowedAt]" : "SYSUTCDATETIME()";
    const dueExpr      = hasDueAt ? "l.[dueAt]" : `DATEADD(day, :days, ${borrowedExpr})`;
    const statusExpr   = hasStatus ? "l.[status]" : `'active'`;

    const rows = await sequelize.query(
      `SELECT 
          l.[id] AS loanId,
          ${borrowedExpr} AS borrowedAt,
          ${dueExpr}      AS dueAt,
          ${statusExpr}   AS [status],
          b.[id]    AS bookId,
          b.[title] AS title,
          b.[author] AS author
          ${hasFileUrl ? ", b.[fileUrl] AS fileUrl" : ""}
       FROM [Loans] l
       JOIN [Books] b ON b.[id] = l.[bookId]
       WHERE l.[userId] = :userId
       ORDER BY ${hasBorrowedAt ? "l.[borrowedAt] DESC" : "l.[id] DESC"}`,
      { replacements: { userId, days: MAX_DAYS }, type: QueryTypes.SELECT }
    );

    return reply.send(
      rows.map(r => ({
        loanId: r.loanId,
        borrowedAt: r.borrowedAt,
        dueAt: r.dueAt,
        status: r.status,
        book: { id: r.bookId, title: r.title, author: r.author, fileUrl: r.fileUrl }
      }))
    );
  } catch (err) {
    req.log.error({ err }, "myLoans failed");
    return reply.code(500).send({ error: "myLoans failed", detail: err?.message });
  }
}

export async function borrow(req, reply) {
  const userId = req.headers["x-user-id"];
  const { bookId } = req.body || {};
  if (!userId) return reply.code(401).send({ error: "Missing userId" });
  if (!bookId) return reply.code(400).send({ error: "bookId is required" });

  try {
    return await sequelize.transaction(async (t) => {
      const book = await sequelize.query(
        `SELECT [id], [available] FROM [Books] WITH (UPDLOCK, ROWLOCK) WHERE [id] = :bookId`,
        { replacements: { bookId }, type: QueryTypes.SELECT, transaction: t }
      );
      if (!book[0]) return reply.code(404).send({ error: "Book not found" });
      if (book[0].available === 0 || book[0].available === false) {
        return reply.code(409).send({ error: "Book is not available" });
      }

      const hasDueAt = await hasColumn("Loans", "dueAt");
      const insertSql = hasDueAt
        ? `DECLARE @dueAt DATETIME2 = DATEADD(day, :days, SYSUTCDATETIME());
           INSERT INTO [Loans] ([userId], [bookId], [borrowedAt], [dueAt], [status])
           OUTPUT INSERTED.[id] AS loanId, INSERTED.[dueAt] AS dueAt
           VALUES (:userId, :bookId, SYSUTCDATETIME(), @dueAt, 'active')`
        : `INSERT INTO [Loans] ([userId], [bookId], [borrowedAt], [status])
           OUTPUT INSERTED.[id] AS loanId
           VALUES (:userId, :bookId, SYSUTCDATETIME(), 'active')`;

      const out = await sequelize.query(insertSql, {
        replacements: { userId, bookId, days: MAX_DAYS },
        type: QueryTypes.INSERT, transaction: t
      });

      await sequelize.query(
        `UPDATE [Books] SET [available] = 0 WHERE [id] = :bookId`,
        { replacements: { bookId }, type: QueryTypes.UPDATE, transaction: t }
      );

      const row = Array.isArray(out) ? (out[0] ?? out) : out;
      const loanId = row?.loanId ?? row?.[0]?.loanId ?? row;
      const dueAt  = row?.dueAt  ?? row?.[0]?.dueAt ?? null;

      return reply.send({ ok: true, loanId, dueAt });
    });
  } catch (err) {
    req.log.error({ err, body: req.body }, "borrow failed");
    return reply.code(500).send({ error: "borrow failed", detail: err?.message });
  }
}

export async function returnLoan(req, reply) {
  const { loanId } = req.body || {};
  if (!loanId) return reply.code(400).send({ error: "loanId is required" });

  try {
    return await sequelize.transaction(async (t) => {
      const row = await sequelize.query(
        `SELECT TOP 1 [id], [bookId], [status] FROM [Loans] WHERE [id] = :loanId`,
        { replacements: { loanId }, type: QueryTypes.SELECT, transaction: t }
      );
      if (!row?.[0]) return reply.code(404).send({ error: "Loan not found" });
      if (row[0].status === "returned") return reply.send({ ok: true });

      // אם אין returnedAt בעמודות — נעדכן רק status
      const hasReturnedAt = await hasColumn("Loans", "returnedAt");
      const updateLoanSql = hasReturnedAt
        ? `UPDATE [Loans] SET [status] = 'returned', [returnedAt] = SYSUTCDATETIME() WHERE [id] = :loanId`
        : `UPDATE [Loans] SET [status] = 'returned' WHERE [id] = :loanId`;

      await sequelize.query(updateLoanSql, {
        replacements: { loanId }, type: QueryTypes.UPDATE, transaction: t
      });
      await sequelize.query(
        `UPDATE [Books] SET [available] = 1 WHERE [id] = :bookId`,
        { replacements: { bookId: row[0].bookId }, type: QueryTypes.UPDATE, transaction: t }
      );

      return reply.send({ ok: true });
    });
  } catch (err) {
    req.log.error({ err, body: req.body }, "returnLoan failed");
    return reply.code(500).send({ error: "return failed", detail: err?.message });
  }
}
