// routes/logsRoutes.js
import { getLogs } from "../controllers/logsController.js";

export default async function logsRoutes(fastify) {
  fastify.get("/", getLogs);
}
