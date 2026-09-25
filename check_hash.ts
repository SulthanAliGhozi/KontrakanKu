import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  const allUsers = await db.select().from(users).where(eq(users.email, 'budi@kontrakanku.com'));
  console.log(allUsers.map(u => ({ name: u.name, hash: u.passwordHash, salt: u.passwordSalt })));
  process.exit(0);
}
check();
