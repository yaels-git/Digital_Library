import { getAllUsers, createUser } from "../controllers/usersController.js";

export default async function usersRoutes(fastify) {
  fastify.get("/", getAllUsers);
  fastify.post("/", createUser);
}
