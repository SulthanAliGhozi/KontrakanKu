import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running migration...');
  try {
    await db.execute(sql`ALTER TABLE needs ADD COLUMN rotation_logic varchar(50)`);
    console.log('Added rotation_logic');
  } catch (e: any) {
    console.log('Error adding rotation_logic:', e.message);
  }
  
  try {
    await db.execute(sql`ALTER TABLE needs ADD COLUMN rotation_participants text`);
    console.log('Added rotation_participants');
  } catch (e: any) {
    console.log('Error adding rotation_participants:', e.message);
  }

  process.exit(0);
}
main();
