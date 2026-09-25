import 'dotenv/config';
import { db } from './src/db/index.js';
import { users, houseMembers } from './src/db/schema.js';
import { inArray } from 'drizzle-orm';

async function fix() {
  const emailsToDelete = ['admin@kontrakanku.com', 'budi@kontrakanku.com'];
  
  // Find their uids
  const usersToDelete = await db.select().from(users).where(inArray(users.email, emailsToDelete));
  const uids = usersToDelete.map(u => u.uid);
  
  if (uids.length > 0) {
    await db.delete(houseMembers).where(inArray(houseMembers.userId, uids)).catch(()=> {});
    await db.delete(users).where(inArray(users.uid, uids));
  }
  console.log('Deleted users:', emailsToDelete);
  process.exit(0);
}
fix();
