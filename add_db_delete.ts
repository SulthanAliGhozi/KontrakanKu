import fs from 'fs';

let content = fs.readFileSync('src/db/users.ts', 'utf8');

if (!content.includes('dbDeleteUser')) {
  content += `
export async function dbDeleteUser(userId: string) {
  try {
    await db.delete(users).where(eq(users.uid, userId));
  } catch (error) {
    console.error('Failed to delete user:', error);
  }
}
`;
  fs.writeFileSync('src/db/users.ts', content);
}
