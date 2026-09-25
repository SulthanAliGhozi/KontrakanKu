import 'dotenv/config';
import { registerDbUser, findDbUserByEmail } from './src/db/users.js';

async function test() {
  try {
    await registerDbUser({
      uid: 'user_test_1',
      name: 'Test User',
      email: 'test1@example.com',
      password: 'password123',
    });
    console.log('Register DB success!');
    const user = await findDbUserByEmail('test1@example.com');
    console.log('Found user:', user);
  } catch (e) {
    console.error('Register DB failed:', e);
  }
}

test().finally(() => process.exit(0));
