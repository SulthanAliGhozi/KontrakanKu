import fs from 'fs';

let content = fs.readFileSync('src/db/users.ts', 'utf8');

// First replace:
content = content.replace(/\.onDuplicateKeyUpdate\(\{\s*set:\s*\{([^}]+)\}\s*\}\)\s*\.returning\(\);/g, (match, p1) => {
  return `.onDuplicateKeyUpdate({ set: {${p1}} });`;
});

// Second replace for `getOrCreateUser` where it might also use `.returning()`
// Actually let's just do a manual string replace.
