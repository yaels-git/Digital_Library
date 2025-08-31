import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";

export async function tableExists(name) {
  const r = await sequelize.query(
    `SELECT 1
       FROM sys.tables t
       JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE t.name = :name AND s.name = 'dbo'`,
    { replacements: { name }, type: QueryTypes.SELECT }
  );
  return r.length > 0;
}

export async function hasColumn(table, col) {
  const r = await sequelize.query(
    `SELECT 1
       FROM sys.columns c
       JOIN sys.tables  t ON t.object_id = c.object_id
       JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE t.name = :table AND s.name = 'dbo' AND c.name = :col`,
    { replacements: { table, col }, type: QueryTypes.SELECT }
  );
  return r.length > 0;
}
