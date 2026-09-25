import 'dotenv/config';
import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('Clearing database...');
  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
    await db.execute(sql`TRUNCATE TABLE activities;`);
    await db.execute(sql`TRUNCATE TABLE wallet_transactions;`);
    await db.execute(sql`TRUNCATE TABLE settlements;`);
    await db.execute(sql`TRUNCATE TABLE maintenance_tasks;`);
    await db.execute(sql`TRUNCATE TABLE expenses;`);
    await db.execute(sql`TRUNCATE TABLE purchases;`);
    await db.execute(sql`TRUNCATE TABLE needs;`);
    await db.execute(sql`TRUNCATE TABLE house_members;`);
    await db.execute(sql`TRUNCATE TABLE users;`);
    await db.execute(sql`TRUNCATE TABLE houses;`);
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);

    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

reset();
