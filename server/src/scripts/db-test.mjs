import 'dotenv/config';
import { Sequelize } from 'sequelize';

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  dialect: 'mssql',
  dialectOptions: { options: { encrypt:false, trustServerCertificate:true } },
});

await db.authenticate();
console.log('OK: connected to SQL');
await db.close();
