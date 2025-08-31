import { User } from "../modules/usersModule.js";

export const getAllUsers = async (req, reply) => {
  const users = await User.findAll();
  reply.send(users);
};

export const createUser = async (req, reply) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password });
  reply.code(201).send(user);
};
