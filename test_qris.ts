import 'dotenv/config';
import { dbUpdateUserQRIS, dbGetUser } from './src/db/houseData.js';

async function test() {
  try {
    await dbUpdateUserQRIS('user_test_1', '000201010212...', 'Warung Test');
    console.log('QRIS DB success!');
    const user = await dbGetUser('user_test_1');
    console.log('Found user:', user);
  } catch (e) {
    console.error('QRIS DB failed:', e);
  }
}

test().finally(() => process.exit(0));
