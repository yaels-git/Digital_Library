import { redis } from "../config/redis.js";
import { Loan } from "./loansModule.js";
import { Book } from "./booksModule.js";

const CACHE_KEY = "top10_books";
const CACHE_TTL = 60 * 5; // 5 דקות cache

export const getTopBooks = async () => {
  // בדיקה אם יש cache ב־Redis
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    console.log("📦 Cache hit (Top 10)");
    return JSON.parse(cached);
  }

  console.log("💾 Cache miss - חישוב מחדש");

  // חישוב פופולריות: ספרים עם הכי הרבה השאלות
  const loans = await Loan.findAll({
    attributes: [Number(loan.get("loanCount"))],
    group: ["bookId"],
    order: [[Loan.sequelize.literal("loanCount"), "DESC"]],
    limit: 10,
    include: [{ model: Book }],
  });

  const result = loans.map((loan) => ({
    bookId: loan.bookId,
    title: loan.Book.title,
    author: loan.Book.author,
    loanCount: loan.get("loanCount"),
  }));

  // שמירה ב־Redis
  await redis.set(CACHE_KEY, JSON.stringify(result), { EX: CACHE_TTL });

  return result;
};
