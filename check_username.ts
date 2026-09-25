import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function check() {
  const allUsers = await db.select().from(users);
  console.log(allUsers.map(u => ({ name: u.name, email: u.email, username: u.username })));
  process.exit(0);
}
check();
