// // server/scripts/init-db.js
// // אתחול וזריעה לבסיס הנתונים של ה-Digital Library
// // שימוש:
// //   node scripts/init-db.js                # alter + seed (ברירת מחדל)
// //   node scripts/init-db.js --force        # בונה מחדש (DROP & CREATE) + seed
// //   node scripts/init-db.js --wipe --force # ב-SQLite מוחק את קובץ ה-DB ואז בונה מחדש + seed
// //   node scripts/init-db.js --no-seed      # אתחול טבלאות בלי זריעה
// //
// import "dotenv/config";
// import fs from "fs/promises";
// import path from "path";
// import { fileURLToPath } from "url";
// import { Sequelize } from "sequelize";

// // חיבורי SQL + מודלים (ESM)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const serverRoot = path.resolve(__dirname, "..");

// import { sequelize } from "../src/config/db.js";

// // חשוב: לייבא את המודלים כדי שיירשמו ל-Sequelize לפני sync
// import "../src/modules/booksModule.js";
// import { Book } from "../src/modules/booksModule.js";
// import "../src/modules/loansModule.js";
// import { Loan } from "../src/modules/loansModule.js";

// // ===== CLI flags =====
// const args = new Set(process.argv.slice(2));
// const FORCE = args.has("--force");
// const WIPE = args.has("--wipe");
// const NO_SEED = args.has("--no-seed");

// // ===== עזר =====
// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// async function maybeWipeSqlite() {
//   const dialect = sequelize.getDialect();
//   if (dialect !== "sqlite") return;
//   if (!WIPE) return;

//   // הנתיב ב-db.js הוא "./library.sqlite" מתיקיית server/
//   const sqlitePath = path.resolve(serverRoot, "library.sqlite");
//   try {
//     await fs.unlink(sqlitePath);
//     console.log("🧹 Removed SQLite file:", sqlitePath);
//   } catch (e) {
//     if (e.code !== "ENOENT") {
//       console.warn("⚠️ Could not delete SQLite file:", e.message);
//     } else {
//       console.log("ℹ️ SQLite file did not exist:", sqlitePath);
//     }
//   }
// }

// async function syncDb() {
//   await sequelize.authenticate();
//   console.log("✅ SQL connected (dialect:", sequelize.getDialect() + ")");

//   if (FORCE) {
//     await sequelize.sync({ force: true });
//     console.log("✅ Models synced with { force: true }");
//   } else {
//     try {
//       await sequelize.sync({ alter: true });
//       console.log("✅ Models synced with { alter: true }");
//     } catch (err) {
//       console.error("❌ sync({alter:true}) failed:", err.message);
//       if (sequelize.getDialect() === "sqlite") {
//         console.warn("➡️ Fallback to { force: true } on SQLite");
//         await sequelize.sync({ force: true });
//         console.log("✅ Models synced with { force: true } (fallback)");
//       } else {
//         throw err;
//       }
//     }
//   }
// }

// async function seedBooks() {
//   const books = [
//     { title: "Clean Code", author: "Robert C. Martin", fileUrl: "https://example.com/clean.pdf", available: true },
//     { title: "Refactoring", author: "Martin Fowler", fileUrl: "https://example.com/refactoring.pdf", available: true },
//     { title: "You Don't Know JS", author: "Kyle Simpson", fileUrl: "https://example.com/ydkjs.pdf", available: true },
//     { title: "Eloquent JavaScript", author: "Marijn Haverbeke", fileUrl: "https://example.com/eloquentjs.pdf", available: true },
//     { title: "Design Patterns (GoF)", author: "Gamma; Helm; Johnson; Vlissides", fileUrl: "https://example.com/gof.pdf", available: true },
//     { title: "The Pragmatic Programmer", author: "Andrew Hunt; David Thomas", fileUrl: "https://example.com/pragprog.pdf", available: true },
//     { title: "Introduction to Algorithms", author: "Cormen; Leiserson; Rivest; Stein", fileUrl: "https://example.com/clrs.pdf", available: true },
//     { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", fileUrl: "https://example.com/ctci.pdf", available: true },
//   ];

//   const created = [];
//   for (const b of books) {
//     // הימנעות מכפילויות לפי (title+author)
//     const [row] = await Book.findOrCreate({
//       where: { title: b.title, author: b.author },
//       defaults: b,
//     });
//     created.push(row);
//   }
//   console.log(`📚 Seeded/ensured ${created.length} books`);
//   return created;
// }

// function addDays(d, days) {
//   return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
// }

// async function seedLoans() {
//   // ניקוי הלואות ישנות אם force:
//   if (FORCE) {
//     await Loan.destroy({ where: {} });
//     await Book.update({ available: true }, { where: {} });
//   }

//   const allBooks = await Book.findAll({ order: [["id", "ASC"]] });
//   if (allBooks.length === 0) {
//     console.log("ℹ️ No books to loan");
//     return;
//   }

//   // dev-1 ישאיל 3 ספרים ראשונים, dev-2 ספר רביעי (אם יש)
//   const now = new Date();
//   const picks = allBooks.slice(0, 3);
//   for (const b of picks) {
//     // אם הספר לא זמין, דלג
//     if (b.available === false) continue;

//     await sequelize.transaction(async (t) => {
//       await Loan.create(
//         {
//           userId: "dev-1",
//           bookId: b.id,
//           borrowedAt: now,
//           dueAt: addDays(now, 7),
//           status: "active",
//         },
//         { transaction: t }
//       );
//       await b.update({ available: false }, { transaction: t });
//     });
//   }

//   if (allBooks[3]) {
//     const b = allBooks[3];
//     if (b.available !== false) {
//       await sequelize.transaction(async (t) => {
//         await Loan.create(
//           {
//             userId: "dev-2",
//             bookId: b.id,
//             borrowedAt: now,
//             dueAt: addDays(now, 14),
//             status: "active",
//           },
//           { transaction: t }
//         );
//         await b.update({ available: false }, { transaction: t });
//       });
//     }
//   }

//   const count = await Loan.count();
//   console.log(`🧾 Seeded ${count} total loans`);
// }

// (async () => {
//   const dialect = (process.env.DB_DIALECT || "sqlite").toLowerCase();
//   console.log("🔧 init-db starting", { dialect, FORCE, WIPE, NO_SEED });

//   if (dialect === "sqlite" && WIPE) {
//     await maybeWipeSqlite();
//     // לפעמים file-lock של nodemon עלול להישאר; המתנה קצרה
//     await sleep(150);
//   }

//   await syncDb();

//   if (!NO_SEED) {
//     await seedBooks();
//     await seedLoans();
//   }

//   console.log("✅ init-db completed");
//   await sequelize.close();
//   process.exit(0);
// })().catch(async (err) => {
//   console.error("❌ init-db failed:", err);
//   try { await sequelize.close(); } catch {}
//   process.exit(1);
// });
