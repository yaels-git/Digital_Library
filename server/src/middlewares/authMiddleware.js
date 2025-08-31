export default async function authMiddleware(req, reply) {
  // לפתוח GET ציבוריים שצריכים לעבוד בלי התחברות
  const openGetPrefixes = ["/api/health", "/books", "/stats/top-books"];
  if (
    req.method === "GET" &&
    openGetPrefixes.some(p => req.raw.url.startsWith(p))
  ) {
    return; // דילוג על אימות
  }

  // Fastify מנרמל לכותרות lowercase
  const userId =
    req.headers["x-user-id"] ||
    req.headers["user-id"] ||
    req.headers["userid"];

  if (!userId) {
    return reply.code(401).send({ error: "Missing userId - Unauthorized" });
  }

  req.user = { id: String(userId) };
}
