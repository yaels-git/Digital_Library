export default function errorHandler(error, request, reply) {
  console.error("❌ Error caught:", error);

  reply.status(error.statusCode || 500).send({
    error: error.message || "Internal Server Error",
  });
}
