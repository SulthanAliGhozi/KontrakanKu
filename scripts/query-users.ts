import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import 'dotenv/config';

async function main() {
  try {
    const allUsers = await db.select().from(users);
    console.log('Users in Database:', allUsers.map((u: any) => `${u.uid} - ${u.email} (${u.role})`));
  } catch (err: any) {
    console.log('Database query notice:', err.message);
  }
  process.exit(0);
}
main();
