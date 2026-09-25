import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

export const SUPER_ADMIN_EMAIL = 'sa.ghozi@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'GhoziSuperAdmin#2026!';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return computed === hash;
}

export async function getOrCreateUser(uid: string, email: string, name?: string, avatarUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email.trim().toLowerCase(),
          ...(name ? { name } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Gagal memproses data pengguna di database.", { cause: error });
  }
}

export async function findDbUserByEmail(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const rows = await db.select().from(users).where(
      or(
        eq(users.email, cleanEmail),
        eq(users.username, cleanEmail),
        eq(users.email, cleanEmail === 'sa.ghozi@gmail.com' ? 's.a.ghozi@gmail.com' : cleanEmail)
      )
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Database findDbUserByEmail failed:", error);
    return null;
  }
}

export async function registerDbUser(params: {
  uid: string;
  name: string;
  email: string;
  username?: string | null;
  password?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  qrisPayload?: string;
}) {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;

    if (params.password) {
      const h = hashPassword(params.password);
      passwordHash = h.hash;
      passwordSalt = h.salt;
    }

    const result = await db.insert(users)
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
      .onConflictDoUpdate({
        target: users.uid,
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

    return result[0];
  } catch (error) {
    console.error("Database registerDbUser failed:", error);
    throw new Error("Gagal mendaftarkan pengguna ke database Cloud SQL.", { cause: error });
  }
}

export async function seedCloudSqlSuperAdmin() {
  try {
    const superAdminEmail = SUPER_ADMIN_EMAIL;
    const existing = await findDbUserByEmail(superAdminEmail);
    const { hash, salt } = hashPassword(SUPER_ADMIN_PASSWORD);

    if (!existing) {
      await db.insert(users).values({
        uid: 'user_ghozi',
        email: superAdminEmail,
        name: 'Sulthan Ali Ghozi',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'super_admin',
        phone: '081234567890',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      });
      console.log('Super admin initialized in Cloud SQL:', superAdminEmail);
    } else {
      // Ensure password hash is set
      await db.update(users)
        .set({
          passwordHash: hash,
          passwordSalt: salt,
          role: 'super_admin',
          name: 'Sulthan Ali Ghozi',
          email: superAdminEmail,
        })
        .where(eq(users.uid, 'user_ghozi'));
      console.log('Super admin password updated in Cloud SQL:', superAdminEmail);
    }
  } catch (error) {
    console.warn("Could not seed super admin into Cloud SQL:", error);
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
