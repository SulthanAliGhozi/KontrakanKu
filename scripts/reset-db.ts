import { db } from '../src/db/index.js';
import { users, houses, houseMembers, needs, purchases, expenses, walletTransactions, settlements, maintenanceTasks, calendarEvents, activities } from '../src/db/schema.js';
import { seedCloudSqlSuperAdmin } from '../src/db/users.js';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('Resetting local database...');
  // Delete all data
  await db.delete(activities);
  await db.delete(calendarEvents);
  await db.delete(maintenanceTasks);
  await db.delete(settlements);
  await db.delete(walletTransactions);
  await db.delete(expenses);
  await db.delete(purchases);
  await db.delete(needs);
  await db.delete(houseMembers);
  await db.delete(houses);
  await db.delete(users);

  console.log('Wiped all data.');
  
  // Recreate the default house so the admin has a house to join
  await db.insert(houses).values({
    id: 'house_harmoni',
    name: 'KONTRAKAN MARKAS WARUNG',
    address: 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Kec. Bojongsoang, Kabupaten Bandung, Jawa Barat 40287'
  });

  console.log('Seeding super admin...');
  await seedCloudSqlSuperAdmin();
  
  console.log('Database reset complete.');
  process.exit(0);
}

reset().catch(e => {
  console.error(e);
  process.exit(1);
});
