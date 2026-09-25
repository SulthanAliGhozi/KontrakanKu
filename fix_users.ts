import fs from 'fs';

let content = fs.readFileSync('src/db/users.ts', 'utf8');

// Fix getOrCreateUser
const getOrCreateRegex = /    const result = await db\.insert\(users\)\s*\.values\(\{([^}]+)\}\)\s*\.onDuplicateKeyUpdate\(\{\s*set:\s*\{([^}]+)\}\s*,\s*\}\)\s*\.returning\(\);\s*return result\[0\];/;
// Wait, the regex is fragile. I will just do string replacement.

content = content.replace(
  `    const result = await db.insert(users)
      .values({
        uid,
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        avatarUrl,
      })
      .onDuplicateKeyUpdate({
        set: {
          email: email.trim().toLowerCase(),
          ...(name ? { name } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      })
      .returning();

    return result[0];`,
  `    await db.insert(users)
      .values({
        uid,
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        avatarUrl,
      })
      .onDuplicateKeyUpdate({
        set: {
          email: email.trim().toLowerCase(),
          ...(name ? { name } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });

    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0];`
);

content = content.replace(
  `    const result = await db.insert(users)
      .values({
        uid: params.uid,
        email: cleanEmail,
        name: params.name,
        passwordHash,
        passwordSalt,
        phone: params.phone || '',
        role: params.role || 'member',
        avatarUrl: params.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        qrisPayload: params.qrisPayload,
      })
      .onDuplicateKeyUpdate({
        set: {
          email: cleanEmail,
          name: params.name,
          ...(passwordHash ? { passwordHash, passwordSalt } : {}),
          ...(params.phone ? { phone: params.phone } : {}),
          ...(params.role ? { role: params.role } : {}),
          ...(params.qrisPayload ? { qrisPayload: params.qrisPayload } : {}),
        },
      })
      .returning();

    return result[0];`,
  `    await db.insert(users)
      .values({
        uid: params.uid,
        email: cleanEmail,
        name: params.name,
        passwordHash,
        passwordSalt,
        phone: params.phone || '',
        role: params.role || 'member',
        avatarUrl: params.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        qrisPayload: params.qrisPayload,
      })
      .onDuplicateKeyUpdate({
        set: {
          email: cleanEmail,
          name: params.name,
          ...(passwordHash ? { passwordHash, passwordSalt } : {}),
          ...(params.phone ? { phone: params.phone } : {}),
          ...(params.role ? { role: params.role } : {}),
          ...(params.qrisPayload ? { qrisPayload: params.qrisPayload } : {}),
        },
      });

    const rows = await db.select().from(users).where(eq(users.uid, params.uid));
    return rows[0];`
);

fs.writeFileSync('src/db/users.ts', content);
