import 'dotenv/config';
import { sequelize } from '../src/config/db.js';
import { Book } from '../src/models/Book.js';
import { Loan } from '../src/models/Loan.js';

async function run() {
  await sequelize.sync({ alter: true });

  const count = await Book.count();
  if (count === 0) {
    await Book.bulkCreate([
      { title: 'Clean Code', author: 'Robert C. Martin', popularity: 95, available: true },
      { title: 'DDIA', author: 'Martin Kleppmann', popularity: 98, available: true },
      { title: "You Don't Know JS Yet", author: 'Kyle Simpson', popularity: 88, available: true },
    ]);
    console.log('✅ Seeded 3 books');
  } else {
    console.log('ℹ️ Books already exist, skipping seed');
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
