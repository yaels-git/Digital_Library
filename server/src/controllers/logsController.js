import * as logsModule from "../modules/logsModule.js";

export const getLogs = async (req, reply) => {
  try {
    const logs = await logsModule.getLogs();
    reply.send(logs);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};
