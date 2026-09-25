import fs from 'fs';

let content = fs.readFileSync('src/db/users.ts', 'utf8');

// Replace .onConflictDoUpdate({ target: users.uid, set: { ... } })
// with .onDuplicateKeyUpdate({ set: { ... } })
// In MySQL, onDuplicateKeyUpdate doesn't need 'target' because it infers it from unique/primary keys.
content = content.replace(/\.onConflictDoUpdate\(\{\s*target:\s*users\.uid,\s*set:/g, '.onDuplicateKeyUpdate({ set:');

fs.writeFileSync('src/db/users.ts', content);
