import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { Book } from "./booksModule.js"; 
// אם בקובץ booksModule יש default export במקום ייצוא בשם:
// החליפי את השורה למטה ל:
// import Book from "./booksModule.js";

// ===== מודל ההשאלות =====
export const Loan = sequelize.define(
  "Loan",
  {
    userId: { type: DataTypes.STRING, allowNull: false },   // תומך במזהים כמו "dev-1"
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    borrowedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    dueAt: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" }, // active|returned|overdue
    returnedAt: { type: DataTypes.DATE },
  },
  { tableName: "Loans" }
);

// ===== קשרים =====
if (Book?.hasMany) {
  Book.hasMany(Loan, { foreignKey: "bookId" });
}
Loan.belongsTo(Book, { foreignKey: "bookId" });

// ===== לוגיקה =====
export async function borrowBook(bookId, userId, days = 7) {
  // בודק זמינות ספר, יוצר השאלה, ומסמן שהספר לא זמין
  const t = await sequelize.transaction();
  try {
    const book = await Book.findByPk(bookId, { transaction: t });
    if (!book) {
      await t.rollback();
      throw new Error("Book not found");
    }
    if (book.available === false) {
      await t.rollback();
      return null; // יחזיר 409 בראוטר
    }

    const borrowedAt = new Date();
    const dueAt = new Date(borrowedAt.getTime() + (Number(days) || 7) * 24 * 60 * 60 * 1000);

    const loan = await Loan.create(
      { userId: String(userId), bookId: Number(bookId), borrowedAt, dueAt, status: "active" },
      { transaction: t }
    );

    await book.update({ available: false }, { transaction: t });

    await t.commit();
    return loan;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function returnBook(loanId) {
  // מסמן הלוואה כמוחזרת ומחזיר זמינות לספר
  const t = await sequelize.transaction();
  try {
    const loan = await Loan.findByPk(Number(loanId), { transaction: t });
    if (!loan) {
      await t.rollback();
      throw new Error("Loan not found");
    }
    if (loan.status === "returned") {
      await t.rollback();
      return loan;
    }

    const book = await Book.findByPk(loan.bookId, { transaction: t });

    await loan.update({ status: "returned", returnedAt: new Date() }, { transaction: t });
    if (book) await book.update({ available: true }, { transaction: t });

    await t.commit();
    return loan;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function getUserLoans(userId) {
  // מחזיר מבנה שמותאם ל־UI: { ok:true, items:[{loanId,..., book:{...}}] }
  const loans = await Loan.findAll({
    where: { userId: String(userId) },
    include: [{ model: Book }],
    order: [["borrowedAt", "DESC"]],
  });

  return loans.map((l) => ({
    loanId: l.id,
    borrowedAt: l.borrowedAt,
    dueAt: l.dueAt,
    status: l.status,
    book: l.Book
      ? {
          id: l.Book.id,
          title: l.Book.title,
          author: l.Book.author,
          fileUrl: l.Book.fileUrl,     // חשוב: תואם ל־UI
          available: l.Book.available,
        }
      : null,
  }));
}
