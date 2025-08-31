
import Fastify from "fastify";
import cors from "@fastify/cors";
import { initDB } from "./src/config/db.js";
import { initRedis } from "./src/config/redis.js";

// טוענים מודלים לפני initDB כדי שהטבלאות יווצרו
import "./src/modules/booksModule.js";
import "./src/modules/loansModule.js";

// ראוטים (גרסת Fastify שנתתי לך קודם)
import loansRoutes from "./src/routes/loansRoutes.js";
import booksRoutes from "./src/routes/booksRoutes.js";   // ← הוספת יבוא
import statsRoutes from "./src/routes/statsRoutes.js"; 
const app = Fastify({ logger: true });

// CORS ל-React
await app.register(cors, { origin: true, credentials: true });

// DB up + sync
await initDB();

await initRedis();

// Health
app.get("/api/health", async () => ({ ok: true }));

// רישום הראוטים פעמיים:
// 1) עם prefix /api
app.register(loansRoutes, { prefix: "/api" });
app.register(booksRoutes, { prefix: "/api" });   // ← חדש
app.register(statsRoutes, { prefix: "/api" });   // ← חדש

// 2) ללא prefix — כדי שקריאות ה-Client ל-/loans/... יעבדו
app.register(loansRoutes);
app.register(booksRoutes);                        // ← חדש
app.register(statsRoutes);                        // ← חדש

// הדפסת טבלת ראוטים לאבחון
app.ready(() => {
  app.log.info("\n" + app.printRoutes());
});

// האזנה
await app.listen({ port: 3000, host: "0.0.0.0" });
