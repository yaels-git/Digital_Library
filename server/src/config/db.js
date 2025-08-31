
import path from "path";

import { Sequelize } from "sequelize";
import "dotenv/config";

const DIALECT = (process.env.DB_DIALECT || "sqlite").toLowerCase();


console.log("🔧 DB cfg", {
  dialect: DIALECT,
  host: process.env.DB_HOST || "",
  port: process.env.DB_PORT || "",
  db: process.env.DB_NAME || "digital_library",
  user: process.env.DB_USER ? "(set)" : "(missing)",
});

let sequelize;

if (DIALECT === "mssql") {
  const {
    DB_HOST = "localhost",
    DB_PORT = "1433",
    DB_NAME = "digital_library",
    DB_USER,
    DB_PASS,
  } = process.env;

  if (!DB_USER) throw new Error("Missing env DB_USER");
  if (!DB_PASS) throw new Error("Missing env DB_PASS");
// === Strip "dbo." when not on MSSQL (e.g., SQLite) ===
if (sequelize.getDialect() !== "mssql") {
  const _origQuery = sequelize.query.bind(sequelize);
  sequelize.query = (sql, options) => {
    if (typeof sql === "string") {
      // מסיר dbo. או [dbo]. עם או בלי סוגריים מרובעים
      sql = sql.replace(/\b(?:\[?dbo\]?\.)(?=[A-Za-z_])/gi, "");
    }
    return _origQuery(sql, options);
  };
  console.log("⚙️  Non-MSSQL dialect: stripping  from raw SQL at runtime");
}

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: "mssql",
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    },
    logging: false,
  });
} else if (DIALECT === "sqlite") {
  // מצב דמו — בלי דרישות ל־DB_USER/DB_PASS
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./library.sqlite",
    logging: false,
  });
} else {
  throw new Error(`Unsupported DB_DIALECT "${DIALECT}"`);
}

export const initDB = async () => {
  await sequelize.authenticate();
  console.log("✅ SQL connected");
  await sequelize.sync({ alter: true });
  console.log("✅ Models synced");
};

export { sequelize };
