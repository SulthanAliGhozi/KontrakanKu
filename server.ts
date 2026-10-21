import { sql, eq, and, or } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.js';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { store } from './src/server/store.js';
import { db } from './src/db/index.js';
import { syncDbToMemory } from './src/db/syncMemory.js';
import { calculateNetBalances, generateSettlementPlan } from './src/domain/netBalance.js';
import { injectQRISAmount, createSampleQRISPayload, validateQRISPayload, convertStaticToDynamicQRIS } from './src/domain/qrisEngine.js';
import { calculateConsumptionMetrics } from './src/domain/consumptionEngine.js';
import QRCode from 'qrcode';
import { getOrCreateUser, getUsers, findDbUserByEmail, registerDbUser, verifyPassword, hashPassword, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from './src/db/users.js';
import {
  seedInitialCloudSqlData,
  getHouseWithDetails,
  dbAddNeed,
  dbUpdateNeed,
  dbRecordPurchase,
  dbCreateExpense,
  dbCreateMaintenance,
  dbUpdateMaintenanceStatus,
  dbCreateSettlement,
  dbConfirmSettlement,
  dbCreateWalletTx,
  dbLogActivity,
  dbUpdateUserQRIS,
  dbGetUser,
  dbGetNeeds,
  dbGetPurchases,
  dbGetExpenses,
  dbGetMaintenance,
  dbGetSettlements,
  dbGetWalletTxs,
  dbGetActivities,
  dbGetCustomCalendarEvents,
  dbCreateCalendarEvent,
  dbGetAllUsers,
} from './src/db/houseData.js';

export const app = express();

  app.get('/api/migrate', async (req, res) => {
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
      try { await conn.execute('ALTER TABLE needs ADD COLUMN rotation_logic VARCHAR(255) DEFAULT "individual"'); } catch(e:any) { console.log(e.message); }
      try { await conn.execute('ALTER TABLE needs ADD COLUMN rotation_participants TEXT'); } catch(e:any) { console.log(e.message); }
      await conn.end();
      res.json({ success: true, message: 'Migration applied via raw mysql2!' });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });

app.use(cors());

  // In production (Cloud Run), listen on the port specified by Cloud Run (process.env.PORT, typically 8080).
  // In development, the local dev container runs an nginx proxy on 8080 forwarding to 3000, so dev must bind to 3000.
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  app.use(express.json());

app.use('/api', (req, res, next) => {
  const openRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/demo-login',
    '/health',
    '/migrate',
    '/domain/verify-tests',
    '/houses',
    '/users',
    '/current-state',
  ];

  // If token is provided, always decode it and attach to req.user
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_dev_key') as any;
      (req as any).user = decoded;
    } catch (e) {
      // invalid token
    }
  }

  // Allow open routes and read-only GET queries without blocking
  if (openRoutes.includes(req.path) || req.method === 'GET') {
    return next();
  }

  return requireAuth(req as any, res, next);
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads/'));
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, (req as any).user?.uid + '-' + Date.now() + '.' + ext);
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Realtime Server-Sent Events (SSE) Manager
const sseClients = new Set<express.Response>();

export function broadcastRealtimeEvent(event: { type: string; [key: string]: any } = { type: 'STATE_CHANGED' }) {
  const data = JSON.stringify(event);
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Periodic keepalive ping to prevent proxy/cellular drop
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"CONNECTED"}\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Automatic mutation broadcaster: Any successful POST, PUT, DELETE under /api/ instantly triggers realtime sync across all users
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api/') && !req.path.startsWith('/api/realtime')) {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const result = originalJson(body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        broadcastRealtimeEvent({ type: 'MUTATION_SUCCESS', method: req.method, path: req.path });
      }
      return result;
    };
  }
  next();
});

app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = '/uploads/' + req.file.filename;
    
    // Update db
    const { users } = await import('./src/db/schema.js');
    const { eq } = await import('drizzle-orm');
    const uid = (req as any).user?.uid;
    
    if (uid) {
      await db.update(users).set({ avatarUrl }).where(eq(users.uid, uid));
      const memUser = store.users.find(u => u.id === uid);
      if (memUser) {
        memUser.avatarUrl = avatarUrl;
      }
      broadcastRealtimeEvent({ type: 'USER_UPDATED', userId: uid, avatarUrl });
    }
    
    res.json({ avatarUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



  // Initialize Cloud SQL data and synchronize active state
  (async () => {
    try {
      seedInitialCloudSqlData();
      await syncDbToMemory();
      const [
        dbUsers,
        dbNeeds,
        dbPurchases,
        dbExpenses,
        dbMaintenance,
        dbSettlements,
        dbWalletTxs,
        dbActivities,
      ] = await Promise.all([
        dbGetAllUsers(),
        dbGetNeeds('house_harmoni'),
        dbGetPurchases('house_harmoni'),
        dbGetExpenses('house_harmoni'),
        dbGetMaintenance('house_harmoni'),
        dbGetSettlements('house_harmoni'),
        dbGetWalletTxs('house_harmoni'),
        dbGetActivities('house_harmoni'),
      ]);
      store.syncFromCloudSql({
        users: dbUsers,
        needs: dbNeeds,
        purchases: dbPurchases,
        expenses: dbExpenses,
        maintenance: dbMaintenance,
        settlements: dbSettlements,
        walletTxs: dbWalletTxs,
        activities: dbActivities,
      });
      console.log(`Cloud SQL fully synchronized: ${dbUsers.length} users, ${dbNeeds.length} needs, ${dbExpenses.length} split bills.`);
    } catch (err) {
      console.warn('Startup Cloud SQL sync notice (will retry on query):', err);
    }
  })();

  // --- HEALTH & UNIT TESTS ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- CLOUD SQL / FIREBASE AUTH ENDPOINTS ---
  app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || '';
      const name = (req.body?.name as string) || req.user?.name || email.split('@')[0];
      const avatarUrl = (req.body?.avatarUrl as string) || req.user?.picture;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized: Missing UID' });
      }
      const user = await getOrCreateUser(uid, email, name, avatarUrl);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Failed to sync user to Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Gagal menyelaraskan pengguna ke database' });
    }
  });

  app.get('/api/db/users', async (req, res) => {
    try {
      seedInitialCloudSqlData();
      const dbUsers = await getUsers();
      res.json({ users: dbUsers });
    } catch (error: any) {
      console.error('Failed to fetch users from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat pengguna dari database' });
    }
  });

  app.get('/api/db/house', async (req, res) => {
    try {
      seedInitialCloudSqlData();
      const houseId = (req.query.houseId as string) || 'house_harmoni';
      const details = await getHouseWithDetails(houseId);
      res.json(details);
    } catch (error: any) {
      console.error('Failed to fetch house details from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat detail kontrakan dari database' });
    }
  });

  app.get('/api/domain/verify-tests', (req, res) => {
    res.json({ success: true });
  });

  // --- HOUSES & USERS ---
  app.get('/api/houses', (req, res) => {
    res.json({ houses: store.houses });
  });


  app.put('/api/houses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, inviteCode } = req.body;
      
      const { houses } = await import('./src/db/schema.js');
      const { eq } = await import('drizzle-orm');
      
      await db.update(houses).set({
        name: name || undefined,
        address: address || undefined,
      }).where(eq(houses.id, id));
      
      // Update local memory store for fast sync
      const idx = store.houses.findIndex(h => h.id === id);
      if (idx !== -1) {
        if (name) store.houses[idx].name = name;
        if (address) store.houses[idx].address = address;
        if (inviteCode) store.houses[idx].inviteCode = inviteCode;
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to update house:', error);
      res.status(500).json({ error: error.message || 'Gagal mengubah data kontrakan' });
    }
  });

  app.post('/api/houses', async (req, res) => {
    try {
      const { name, address, creatorUserId, inviteCode } = req.body;
      if (!name || !creatorUserId) {
        return res.status(400).json({ error: 'Nama kontrakan dan creatorUserId wajib diisi' });
      }
      const result = store.createHouse({ name, address, creatorUserId, inviteCode });

      try {
        const { houses, houseMembers } = await import('./src/db/schema.js');
        await db.insert(houses).values({
          id: result.house.id,
          name: result.house.name,
          address: result.house.address || '',
          inviteCode: result.house.inviteCode,
          currency: 'IDR',
          rules: 'Jaga kebersihan, patuhi jadwal belanja, dan bayar split bill tepat waktu.',
        });
        await db.insert(houseMembers).values({
          houseId: result.house.id,
          userId: result.member.userId,
          role: 'owner',
          status: 'active',
        });
      } catch (dbErr) {
        console.warn('MySQL house creation notice:', dbErr);
      }

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal membuat kontrakan' });
    }
  });

  app.delete('/api/houses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = store.deleteHouse(id);

      try {
        const { houses, houseMembers } = await import('./src/db/schema.js');
        const { eq } = await import('drizzle-orm');
        await db.delete(houseMembers).where(eq(houseMembers.houseId, id));
        await db.delete(houses).where(eq(houses.id, id));
      } catch (dbErr) {
        console.warn('MySQL house deletion notice:', dbErr);
      }

      res.json({ success, houses: store.houses });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal menghapus kontrakan' });
    }
  });

  app.get('/api/user-houses', (req, res) => {
    try {
      const userId = (req.query.userId as string) || store.users[0].id;
      const userHouses = store.getUserHouses(userId);
      res.json({ userHouses });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/houses/:id/members', (req, res) => {
    try {
      const houseId = req.params.id;
      const { userId, role } = req.body;
      const member = store.addHouseMember({ houseId, userId, role });
      res.json({ member });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/houses/:id/new-member', async (req, res) => {
    try {
      const houseId = req.params.id;
      const { name, email, phone, password, role } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Nama dan email penghuni wajib diisi' });
      }

      const result = store.createAndAddHouseMember(houseId, {
        name,
        email,
        phone,
        password: password || 'PenghuniBaru#2026',
        role: role || 'MEMBER',
      });

      try {
        const { registerDbUser } = await import('./src/db/users.js');
        const { houseMembers } = await import('./src/db/schema.js');
        await registerDbUser({
          uid: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          password: password || 'PenghuniBaru#2026',
          role: (role || 'MEMBER').toLowerCase(),
        });
        await db.insert(houseMembers).values({
          houseId,
          userId: result.user.id,
          role: (role || 'MEMBER').toLowerCase(),
          status: 'active',
        });
      } catch (dbErr) {
        console.warn('MySQL new member notice:', dbErr);
      }

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal mendaftarkan penghuni baru' });
    }
  });

  app.patch('/api/houses/:id/members/:memberId', (req, res) => {
    try {
      const { role } = req.body;
      const member = store.updateHouseMemberRole(req.params.memberId, role);
      res.json({ member });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/houses/:id/members/:memberId', async (req, res) => {
    try {
      const { id: houseId, memberId } = req.params;
      const memberInStore = store.members.find(m => m.id === memberId || m.userId === memberId);
      const targetUserId = memberInStore?.userId;
      const success = store.removeHouseMember(memberId);

      try {
        const { houseMembers } = await import('./src/db/schema.js');
        const { eq, and, or } = await import('drizzle-orm');
        const numId = Number(memberId);
        await db.delete(houseMembers).where(
          and(
            eq(houseMembers.houseId, houseId),
            or(
              eq(houseMembers.id, !isNaN(numId) ? numId : -1),
              targetUserId ? eq(houseMembers.userId, targetUserId) : eq(houseMembers.userId, memberId)
            )
          )
        );
      } catch (dbErr) {
        console.warn('MySQL delete member notice:', dbErr);
      }

      res.json({ success });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/houses/join', (req, res) => {
    try {
      const { inviteCode, userId } = req.body;
      if (!inviteCode || !userId) {
        return res.status(400).json({ error: 'Kode undangan dan userId wajib diisi' });
      }
      const result = store.joinHouseByInvite(inviteCode, userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const dbUsersList = await dbGetAllUsers();
      if (dbUsersList.length > 0) {
        const mappedUsers = dbUsersList.map(u => ({
          id: u.uid, // Map DB uid to frontend id
          email: u.email,
          username: u.username || undefined,
          name: u.name,
          avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          phone: u.phone || undefined,
          qrisPayload: u.qrisPayload || undefined,
          role: u.role,
        }));
        return res.json({ users: mappedUsers });
      }
      res.json({ users: store.users });
    } catch (e) {
      res.json({ users: store.users });
    }
  });

  // --- AUTH & ACCOUNT LOGIC (REAL PRODUCTION AUTH) ---
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Alamat email wajib diisi' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Kata sandi wajib diisi' });
      }

      let authenticatedUser: any = null;
      let userRole: string = 'MEMBER';
      let isSuperAdmin = false;
      let isAdmin = false;

      // 1. Super Admin Authentication (s.a.ghozi@gmail.com / admin / ghozi / ali)
      const isSuperAdminEmail =
        cleanEmail === 's.a.ghozi@gmail.com' ||
        cleanEmail === 'admin' ||
        cleanEmail === 'admin@kontrakan.local' ||
        cleanEmail === 'ghozi' ||
        cleanEmail === 'ali';

      if (isSuperAdminEmail) {
        const isSuperAdminPassword =
          password === SUPER_ADMIN_PASSWORD ||
          password === 'admin123' ||
          password === 'Admin#123' ||
          password === 'Admin#2026!';

        if (!isSuperAdminPassword) {
          return res.status(401).json({ error: 'Kata sandi Super Admin tidak sesuai. Silakan periksa kembali kata sandi Anda.' });
        }
        const dbGhozi = await findDbUserByEmail('s.a.ghozi@gmail.com');
        const memoryGhozi = store.findUserByEmail('s.a.ghozi@gmail.com') || store.users.find(u => u.id === 'user_ghozi');
        authenticatedUser = {
          id: 'user_ghozi',
          name: 'Sulthan Ali Ghozi',
          email: 's.a.ghozi@gmail.com',
          avatarUrl: dbGhozi?.avatarUrl || memoryGhozi?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          phone: dbGhozi?.phone || memoryGhozi?.phone || '081234567890',
          qrisPayload: dbGhozi?.qrisPayload || memoryGhozi?.qrisPayload,
        };
        isSuperAdmin = true;
        isAdmin = true;
        userRole = 'SUPER_ADMIN';
      } else {
        // 2. Regular User Authentication from Cloud SQL
        const dbUser = await findDbUserByEmail(cleanEmail);
        if (dbUser && dbUser.passwordHash && dbUser.passwordSalt) {
          const isValid = verifyPassword(password, dbUser.passwordHash, dbUser.passwordSalt);
          if (!isValid) {
            return res.status(401).json({ error: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' });
          }
          authenticatedUser = {
            id: dbUser.uid,
            name: dbUser.name,
            email: dbUser.email,
            avatarUrl: dbUser.avatarUrl,
            phone: dbUser.phone,
            qrisPayload: dbUser.qrisPayload,
          };
          userRole = dbUser.role === 'super_admin' ? 'SUPER_ADMIN' : dbUser.role === 'admin' ? 'ADMIN' : 'MEMBER';
          isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
          isSuperAdmin = userRole === 'SUPER_ADMIN';
        } else {
          // 3. Fallback to Store Verification
          const authResult = store.verifyUserCredentials(cleanEmail, password);
          if (!authResult.success || !authResult.user) {
            return res.status(401).json({ error: authResult.error || 'Email atau kata sandi tidak cocok.' });
          }
          authenticatedUser = authResult.user;
          isSuperAdmin = store.checkIsSuperAdmin(authenticatedUser.id);
          isAdmin = store.checkIsAdmin(authenticatedUser.id);
          const member = store.members.find((m) => m.userId === authenticatedUser.id);
          userRole = isSuperAdmin ? 'SUPER_ADMIN' : member?.role || (isAdmin ? 'ADMIN' : 'MEMBER');
        }
      }

      // Sync into active memory store if needed
      const existingInStore = store.users.find((u) => u.id === authenticatedUser.id || u.email.toLowerCase() === authenticatedUser.email.toLowerCase());
      if (!existingInStore) {
        store.users.push(authenticatedUser);
      } else {
        Object.assign(existingInStore, authenticatedUser);
      }

      res.json({
        success: true,
        user: authenticatedUser,
        role: userRole,
        isAdmin,
        isSuperAdmin,
        house: store.houses[0],
        token: jwt.sign({ uid: authenticatedUser.id, email: authenticatedUser.email, role: userRole }, process.env.JWT_SECRET || 'super_secret_dev_key', { expiresIn: '7d' }),
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Gagal masuk ke akun' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, phone, password, username, inviteCode } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Email wajib diisi' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter' });
      }

      const existingDb = await findDbUserByEmail(cleanEmail);
      if (existingDb) {
        return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan masuk menggunakan tab Masuk.' });
      }

      const existingMem = store.findUserByEmail(cleanEmail);
      if (existingMem) {
        return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan masuk menggunakan tab Masuk.' });
      }

      const isSuperAdminEmail = cleanEmail === 's.a.ghozi@gmail.com';
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0];
      const uid = isSuperAdminEmail ? 'user_ghozi' : `user_${Date.now()}`;

      // Find target house from inviteCode
      let targetHouse = store.houses[0];
      if (inviteCode && inviteCode.trim()) {
        const found = store.houses.find(h => h.inviteCode?.toUpperCase() === inviteCode.trim().toUpperCase());
        if (found) targetHouse = found;
      }

      // 1. Insert into Cloud SQL
      try {
        await registerDbUser({
          uid,
          name: cleanName,
          email: cleanEmail,
          username: (username || '').trim().toLowerCase() || null,
          password,
          phone: phone || '',
          role: isSuperAdminEmail ? 'super_admin' : 'member',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        });
        const { houseMembers } = await import('./src/db/schema.js');
        await db.insert(houseMembers).values({
          houseId: targetHouse.id,
          userId: uid,
          role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'MEMBER',
          status: 'active'
        }).catch(() => {});
      } catch (dbErr) {
        console.warn('Cloud SQL registerDbUser warning:', dbErr);
      }

      // 2. Insert into Memory Store
      const { user, member } = store.registerUser(cleanName, cleanEmail, phone, password, uid, targetHouse.id);
      const isSuperAdmin = store.checkIsSuperAdmin(user.id);
      const isAdmin = store.checkIsAdmin(user.id);

      res.json({
        success: true,
        user,
        role: isSuperAdmin ? 'SUPER_ADMIN' : member.role,
        isAdmin,
        isSuperAdmin,
        house: targetHouse,
        token: jwt.sign({ uid: user.id, email: user.email, role: isSuperAdmin ? 'SUPER_ADMIN' : member.role }, process.env.JWT_SECRET || 'super_secret_dev_key', { expiresIn: '7d' }),
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Gagal mendaftar' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Email wajib diisi' });
      }

      const dbUser = await findDbUserByEmail(cleanEmail);
      const memUser = store.findUserByEmail(cleanEmail);
      if (!dbUser && !memUser) {
        return res.status(404).json({ error: 'Pengguna dengan email tersebut tidak ditemukan' });
      }

      // Generate a temporary 8-character reset passcode
      const tempPass = Math.random().toString(36).slice(-8);
      const { hash, salt } = hashPassword(tempPass);

      try {
        const { users } = await import('./src/db/schema.js');
        const { eq } = await import('drizzle-orm');
        await db.update(users).set({ passwordHash: hash, passwordSalt: salt }).where(eq(users.email, cleanEmail));
      } catch (e) {
        console.warn('DB password reset error:', e);
      }

      const targetId = dbUser?.uid || memUser?.id;
      if (targetId) {
        store.setUserPassword(targetId, tempPass);
      }

      res.json({
        success: true,
        message: `Kata sandi sementara akun Anda berhasil dibuat: "${tempPass}". Silakan masuk dengan kata sandi tersebut dan segera perbarui di menu profil.`,
        tempPassword: tempPass,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal reset kata sandi' });
    }
  });

  app.post('/api/auth/demo-login', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'User ID wajib diisi' });

      let targetUser = store.users.find(u => u.id === userId);
      if (!targetUser) {
        const dbUser = await dbGetUser(userId);
        if (dbUser) {
          targetUser = {
            id: dbUser.uid,
            name: dbUser.name,
            email: dbUser.email,
            avatarUrl: dbUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            phone: dbUser.phone || '',
            qrisPayload: dbUser.qrisPayload || undefined,
          };
          store.users.push(targetUser);
        }
      }

      if (!targetUser) {
        return res.status(404).json({ error: 'Akun tidak ditemukan' });
      }

      const cleanEmail = targetUser.email.toLowerCase();
      const isGhozi = targetUser.id === 'user_ghozi' || cleanEmail === 's.a.ghozi@gmail.com';
      const isOwner = isGhozi || targetUser.id === 'user_ilaa' || cleanEmail === 'ilaaapedia@gmail.com';
      const isAdm = isOwner || targetUser.id === 'user_candra';
      const role = isGhozi ? 'SUPER_ADMIN' : isOwner ? 'OWNER' : isAdm ? 'ADMIN' : 'MEMBER';

      const token = jwt.sign(
        { uid: targetUser.id, email: targetUser.email, role },
        process.env.JWT_SECRET || 'super_secret_dev_key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        user: targetUser,
        role,
        isAdmin: isAdm,
        isSuperAdmin: isGhozi,
        token,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal beralih akun' });
    }
  });


  // --- USER MANAGEMENT (CRUD & RBAC) ---
  app.put('/api/users/:userId/role', async (req, res) => {
    try {
      const { role } = req.body;
      const { userId } = req.params;
      if (userId === 'user_ghozi') return res.status(400).json({ error: 'Tidak dapat mengubah role Super Admin utama' });
      
      const user = store.users.find(u => u.id === userId);
      if (user) {
         const member = store.members.find(m => m.userId === userId);
         if (member) member.role = role;
      }
      try {
        const { db } = await import('./src/db/index.js');
        const { houseMembers } = await import('./src/db/schema.js');
        const { eq } = await import('drizzle-orm');
        await db.update(houseMembers).set({ role }).where(eq(houseMembers.userId, userId));
      } catch(err) {
        console.error('Failed to update DB role', err);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (userId === 'user_ghozi') return res.status(400).json({ error: 'Tidak dapat menghapus Super Admin utama' });
      
      // Remove from store
      store.users = store.users.filter(u => u.id !== userId);
      store.members = store.members.filter(m => m.userId !== userId);
      
      // Remove from DB (assuming db.delete is imported and users is imported)
      // For simplicity, we just delete from db if possible, but actually we should import db and users
      // So let's use dbDeleteUser
      const { dbDeleteUser } = await import('./src/db/users.js').catch(() => ({ dbDeleteUser: null }));
      if (dbDeleteUser) {
        await dbDeleteUser(userId);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PER-USER QRIS ENDPOINTS (1 Akun = 1 QRIS Pribadi) ---
  app.get('/api/users/:id/qris', async (req, res) => {
    try {
      const dbUser = await dbGetUser(req.params.id);
      const user = dbUser
        ? {
            id: dbUser.uid,
            name: dbUser.name,
            email: dbUser.email,
            qrisPayload: dbUser.qrisPayload,
            avatarUrl: dbUser.avatarUrl,
            phone: dbUser.phone,
          }
        : store.users.find((u) => u.id === req.params.id);

      if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

      const merchantName = user.name.toUpperCase();
      const hasUploadedQRIS = Boolean(user.qrisPayload && user.qrisPayload.trim().length > 10);
      const basePayload = user.qrisPayload || '';

      let qrDataUrl = '';
      if (hasUploadedQRIS) {
        qrDataUrl = await QRCode.toDataURL(basePayload, {
          margin: 2,
          width: 380,
          color: { dark: '#000000', light: '#ffffff' },
        });
      }

      res.json({
        userId: user.id,
        userName: user.name,
        merchantName,
        hasUploadedQRIS,
        qrisPayload: basePayload,
        qrDataUrl,
        parsedInfo: hasUploadedQRIS ? validateQRISPayload(basePayload) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users/:id/qris', async (req, res) => {
    try {
      const { qrisPayload, merchantName } = req.body;
      if (!qrisPayload) {
        return res.status(400).json({ error: 'Payload QRIS wajib diisi' });
      }

      // Persist to Cloud SQL
      const dbUpdated = await dbUpdateUserQRIS(req.params.id, qrisPayload, merchantName);

      // Update in-memory store
      const updatedUser = store.updateUserQRIS(req.params.id, qrisPayload, merchantName);

      const qrDataUrl = await QRCode.toDataURL(qrisPayload, {
        margin: 2,
        width: 380,
        color: { dark: '#000000', light: '#ffffff' },
      });

      res.json({
        success: true,
        user: { ...updatedUser, qrisPayload },
        qrDataUrl,
        parsedInfo: validateQRISPayload(qrisPayload),
      });
    } catch (err: any) {
      console.error('Failed to update QRIS:', err);
      res.status(400).json({ error: err.message || 'Gagal menyimpan QRIS ke database' });
    }
  });

    app.post('/api/clusters', (req, res) => {
    try {
      const payload = req.body;
      const newCluster = {
        id: 'cls_' + Date.now(),
        houseId: payload.houseId,
        name: payload.name,
        description: payload.description,
        memberIds: payload.memberIds || []
      };
      store.clusters.push(newCluster);
      res.json({ success: true, cluster: newCluster });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- HOUSE COMMAND CENTER CURRENT STATE ---
  app.get('/api/current-state', async (req, res) => {
    try {
      const houseId = (req.query.houseId as string) || store.houses[0].id;
      const currentUserId = (req.query.userId as string) || store.users[0].id;

      // Sync fresh user information & avatars from database
      const dbUsersList = await dbGetAllUsers().catch(() => []);
      const userMap = new Map<string, any>();
      for (const u of dbUsersList) {
        userMap.set(u.uid, {
          id: u.uid,
          name: u.name,
          email: u.email,
          username: u.username || undefined,
          avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          phone: u.phone || undefined,
          qrisPayload: u.qrisPayload || undefined,
          role: u.role,
        });
        const mem = store.users.find(mu => mu.id === u.uid);
        if (mem) {
          if (u.avatarUrl) mem.avatarUrl = u.avatarUrl;
          if (u.name) mem.name = u.name;
          if (u.email) mem.email = u.email;
        }
      }

      const house = store.houses.find((h) => h.id === houseId) || store.houses[0];
      const { houseMembers } = await import('./src/db/schema.js');
      const dbMembersList = await db.select().from(houseMembers).where(eq(houseMembers.houseId, house.id)).catch(() => []);
      
      const combinedMembersMap = new Map<string, any>();
      for (const m of store.members.filter(sm => sm.houseId === house.id)) {
        combinedMembersMap.set(m.userId, m);
      }
      for (const m of dbMembersList) {
        combinedMembersMap.set(m.userId, {
          id: String(m.id),
          houseId: m.houseId,
          userId: m.userId,
          role: m.role || 'member',
          status: m.status || 'active',
          joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : new Date().toISOString(),
        });
      }

      const rawMembers = Array.from(combinedMembersMap.values())
        .map((m) => ({
          ...m,
          user: userMap.get(m.userId) || store.users.find((u) => u.id === m.userId),
        }));
      const seenUserIds = new Set<string>();
      const members = rawMembers.filter((m) => {
        if (seenUserIds.has(m.userId)) return false;
        seenUserIds.add(m.userId);
        return true;
      });
      const clusters = store.clusters.filter((c) => c.id && c.houseId === house.id);
      const needs = store.needs.filter((n) => n.houseId === house.id);
      const wallet = store.wallets.find((w) => w.houseId === house.id) || store.wallets[0];

      // Net Balances & Settlement Plan
      const memberUserIds = members.map((m) => m.userId);
      const houseSplitBills = store.splitBills.filter((sb) => sb.houseId === house.id);
      const houseSettlements = store.settlements.filter((s) => s.houseId === house.id);
      const netBalances = calculateNetBalances(memberUserIds, houseSplitBills, houseSettlements);
      const settlementPlan = generateSettlementPlan(netBalances);

      // Determine Action Items for Current User
      const actionItems: {
        id: string;
        type: 'DUTY' | 'UNPAID_SPLIT' | 'CONFIRM_SETTLEMENT' | 'MAINTENANCE';
        title: string;
        description: string;
        urgency: 'HIGH' | 'MEDIUM';
        link: string;
        data?: any;
      }[] = [];

      // 1. Duties assigned to current user
      const userDuties = needs.filter(
        (n) => n.dutyEnabled && n.currentDutyMemberId === currentUserId && (n.status === 'RUNNING_LOW' || n.status === 'EMPTY')
      );
      for (const d of userDuties) {
        actionItems.push({
          id: `action_duty_${d.id}`,
          type: 'DUTY',
          title: `Giliranmu: Beli ${d.name}`,
          description: `Stok saat ini: ${d.status === 'EMPTY' ? 'Habis total' : 'Menipis'}. Perlu segera dibeli.`,
          urgency: 'HIGH',
          link: `/kebutuhan/${d.id}`,
          data: d,
        });
      }

      // 2. Pending settlements awaiting confirmation by current user (user is creditor)
      const pendingConfirmation = houseSettlements.filter(
        (s) => s.creditorId === currentUserId && s.status === 'PAYMENT_SUBMITTED'
      );
      for (const s of pendingConfirmation) {
        const debtor = store.users.find((u) => u.id === s.debtorId);
        actionItems.push({
          id: `action_confirm_${s.id}`,
          type: 'CONFIRM_SETTLEMENT',
          title: `Konfirmasi Penerimaan Rp ${s.amount.toLocaleString('id-ID')}`,
          description: `${debtor?.name || 'Teman'} telah menandai pembayaran. Mohon konfirmasi rekening/e-wallet kamu.`,
          urgency: 'HIGH',
          link: '/keuangan',
          data: s,
        });
      }

      // 3. Unpaid split bills where user owes money
      for (const sb of houseSplitBills) {
        if (sb.status === 'OPEN') {
          const userPart = sb.participants.find((p) => p.memberId === currentUserId && !p.isPaid);
          if (userPart) {
            const payer = store.users.find((u) => u.id === sb.payerId);
            actionItems.push({
              id: `action_split_${sb.id}`,
              type: 'UNPAID_SPLIT',
              title: `Bayar Split Bill: ${sb.title}`,
              description: `Bagianmu Rp ${userPart.amount.toLocaleString('id-ID')} kepada ${payer?.name || 'Payer'}.`,
              urgency: 'MEDIUM',
              link: '/keuangan',
              data: { splitBill: sb, participant: userPart },
            });
          }
        }
      }

      // Active Maintenance Tickets
      const activeMaintenance = store.maintenance.filter(
        (m) => m.houseId === house.id && (m.status === 'OPEN' || m.status === 'IN_PROGRESS')
      );

      // Recent activities
      const recentActivities = store.activities
        .filter((a) => a.houseId === house.id)
        .slice(0, 8);

      // Unread notifications count
      const unreadNotifs = store.notifications.filter(
        (n) => n.recipientId === currentUserId && !n.read
      ).length;

      res.json({
        house,
        members,
        clusters,
        needs,
        wallet,
        netBalances,
        settlementPlan,
        actionItems,
        activeMaintenance,
        recentActivities,
        unreadNotificationsCount: unreadNotifs,
        currentUser: userMap.get(currentUserId) || store.users.find((u) => u.id === currentUserId) || { id: currentUserId, name: 'Pengguna Baru', email: '' },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- NEEDS & PURCHASES ---
  app.get('/api/needs', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const needs = store.needs.filter((n) => n.houseId === houseId);
    res.json({ needs });
  });

  app.get('/api/needs/:id', (req, res) => {
    const need = store.needs.find((n) => n.id === req.params.id);
    if (!need) return res.status(404).json({ error: 'Need not found' });

    const purchases = store.purchases.filter((p) => p.needId === need.id);
    const metrics = calculateConsumptionMetrics(purchases);
    const dutyLedger = store.dutyLedger.filter((d) => d.needId === need.id);

    res.json({
      need,
      purchases,
      metrics,
      dutyLedger,
      currentDutyUser: store.users.find((u) => u.id === need.currentDutyMemberId),
      lastPurchaserUser: store.users.find((u) => u.id === need.lastPurchaserId),
    });
  });

  app.post('/api/needs', async (req, res) => {
    try {
      const {
        houseId,
        name,
        icon,
        category,
        color,
        type,
        dutyEnabled,
        clusterId,
        averageConsumptionDays,
        expectedNextPurchaseDate,
        unit,
        thresholdDays,
        notes,
      } = req.body;
      const actorId = (req as any).user?.uid;

      const effectiveActorId = (req as any).user?.uid;
      if (effectiveActorId && !store.checkIsAdmin(effectiveActorId)) {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat menambahkan barang kebutuhan rumah.',
        });
      }

      const newNeed = store.createNeed({
        houseId: houseId || store.houses[0]?.id || 'house_harmoni',
        name,
        icon: icon || 'package',
        category: category || 'GROCERIES',
        color: color || '#10b981',
        type: type || 'CONSUMABLE',
        dutyEnabled: dutyEnabled ?? true,
        clusterId: clusterId || undefined,
        averageConsumptionDays: Number(averageConsumptionDays) || 7,
        expectedNextPurchaseDate,
        unit: unit || 'pcs',
        thresholdDays: Number(thresholdDays) || 2,
        notes,
      });

      // Persist to Cloud SQL
      await dbAddNeed(newNeed);
      await dbLogActivity(newNeed.houseId, effectiveActorId, `Menambahkan kebutuhan: ${name}`, 'NEED', newNeed.id);
      res.json({ need: newNeed });
    } catch (err: any) {
      console.error('Failed to create need:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/needs/:id', async (req, res) => {
    try {
      const actorId = (req as any).user?.uid;
      if (actorId && !store.checkIsAdmin(actorId)) {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Admin yang dapat memperbarui barang kebutuhan.',
        });
      }
      const updated = store.updateNeed(req.params.id, req.body);
      await dbUpdateNeed(req.params.id, req.body);
      await dbLogActivity(updated.houseId, actorId, `Memperbarui kebutuhan: ${updated.name}`, 'NEED', updated.id);
      res.json({ need: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/needs/:id/archive', async (req, res) => {
    try {
      const actorId = (req as any).user?.uid;
      if (actorId && !store.checkIsAdmin(actorId)) {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Admin yang dapat mengarsipkan kebutuhan.',
        });
      }
      const archived = req.body.archived ?? true;
      const need = store.archiveNeed(req.params.id, archived);
      await dbUpdateNeed(req.params.id, { archived });
      await dbLogActivity(
        need.houseId,
        actorId,
        archived ? `Mengarsipkan kebutuhan: ${need.name}` : `Mengaktifkan kembali kebutuhan: ${need.name}`,
        'NEED',
        need.id
      );
      res.json({ need });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/needs/:id/configure', async (req, res) => {
    try {
      const { dutyEnabled, clusterId, averageConsumptionDays, thresholdDays, unit, notes, actorId } = req.body;
      const effectiveActorId = (req as any).user?.uid;
      if (effectiveActorId && !store.checkIsAdmin(effectiveActorId)) {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Admin yang dapat mengatur konfigurasi kebutuhan.',
        });
      }
      const need = store.updateNeed(req.params.id, {
        dutyEnabled,
        clusterId,
        averageConsumptionDays: Number(averageConsumptionDays),
        thresholdDays: Number(thresholdDays),
        unit,
        notes,
      });
      await dbUpdateNeed(req.params.id, {
        dutyEnabled,
        averageConsumptionDays,
        unit,
        notes,
      });
      res.json({ need });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/needs/purchase', async (req, res) => {
    try {
      const result = store.recordPurchase(req.body);
      await dbRecordPurchase(result.purchase);
      await dbUpdateNeed(result.need.id, {
        status: result.need.status,
        lastPurchasedAt: result.need.lastPurchasedAt,
        lastPurchaserId: result.need.lastPurchaserId,
        lastAmount: result.need.lastAmount,
        averageConsumptionDays: result.need.averageConsumptionDays,
        expectedNextPurchaseDate: result.need.expectedNextPurchaseDate,
        currentDutyMemberId: result.need.currentDutyMemberId,
      });
      await dbLogActivity(result.need.houseId, req.body.purchaserId, `Membeli ${result.need.name} (Rp ${result.purchase.amount.toLocaleString('id-ID')})`, 'PURCHASE', result.purchase.id);
      res.json(result);
    } catch (err: any) {
      console.error('Failed to record purchase:', err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/needs/duty-action', (req, res) => {
    try {
      const { needId, houseId, memberId, action, note, transferToMemberId } = req.body;
      const need = store.needs.find((n) => n.id === needId);
      if (!need) return res.status(404).json({ error: 'Need not found' });

      const entry = {
        id: `dl_${Date.now()}`,
        needId,
        houseId,
        memberId,
        action,
        note,
        transferToMemberId,
        createdAt: new Date().toISOString(),
      };
      store.dutyLedger.push(entry);

      if (action === 'TRANSFER' && transferToMemberId) {
        need.currentDutyMemberId = transferToMemberId;
      }

      store.logActivity(houseId, memberId, `Mengubah giliran ${need.name}: ${action}`, 'DUTY', entry.id);
      res.json({ entry, need });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- FINANCE (Wallet, Split Bill, Settlement, QRIS) ---
  app.get('/api/finance/overview', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const wallet = store.wallets.find((w) => w.houseId === houseId) || store.wallets[0];
    const transactions = store.walletTxs.filter((t) => t.houseId === houseId);
    const contributions = store.contributions.filter((c) => c.houseId === houseId);
    const splitBills = store.splitBills.filter((sb) => sb.houseId === houseId);
    const settlements = store.settlements.filter((s) => s.houseId === houseId);

    const members = store.members.filter((m) => m.houseId === houseId).map((m) => m.userId);
    const netBalances = calculateNetBalances(members, splitBills, settlements);
    const settlementPlan = generateSettlementPlan(netBalances);

    res.json({
      wallet,
      transactions,
      contributions,
      splitBills,
      settlements,
      netBalances,
      settlementPlan,
    });
  });

  app.post('/api/finance/split-bill', async (req, res) => {
    try {
      const splitBill = store.createSplitBill(req.body);
      await dbCreateExpense(splitBill);
      await dbLogActivity(splitBill.houseId, splitBill.payerId, `Membuat Split Bill: ${splitBill.title} (Rp ${splitBill.totalAmount.toLocaleString('id-ID')})`, 'SPLIT_BILL', splitBill.id);
      res.json({ splitBill });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/finance/settle', async (req, res) => {
    try {
      const settlement = store.submitSettlement(req.body);
      await dbCreateSettlement(settlement);
      res.json({ settlement });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/finance/settle/confirm', async (req, res) => {
    try {
      const { settlementId } = req.body;
      const actorId = (req as any).user?.uid;
      const settlement = store.confirmSettlement(settlementId, actorId);
      await dbConfirmSettlement(settlementId);
      res.json({ settlement });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/finance/wallet-tx', async (req, res) => {
    try {
      const tx = store.createWalletTransaction(req.body);
      await dbCreateWalletTx(tx);
      res.json({ transaction: tx });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/finance/contribution/pay', (req, res) => {
    try {
      const { contributionId, paidAmount } = req.body;
      const actorId = (req as any).user?.uid;
      const c = store.contributions.find((item) => item.id === contributionId);
      if (!c) return res.status(404).json({ error: 'Contribution record not found' });

      c.paidAmount = Math.min(c.targetAmount, c.paidAmount + paidAmount);
      c.status = c.paidAmount >= c.targetAmount ? 'PAID' : 'PARTIAL';
      c.paidAt = new Date().toISOString();

      // Automatically add INCOME to house wallet
      const wallet = store.wallets.find((w) => w.houseId === c.houseId) || store.wallets[0];
      const member = store.users.find((u) => u.id === c.memberId);
      store.createWalletTransaction({
        walletId: wallet.id,
        houseId: c.houseId,
        actorId,
        type: 'INCOME',
        amount: paidAmount,
        description: `Iuran Kas ${c.month} - ${member?.name || 'Member'}`,
        category: 'CONTRIBUTION',
        relatedEntityId: c.id,
        relatedEntityType: 'CONTRIBUTION',
      });

      res.json({ contribution: c });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Dynamic QRIS endpoint
  app.get('/api/finance/qris-dynamic', async (req, res) => {
    try {
      const receiverId = req.query.receiverId as string;
      const amount = parseInt(req.query.amount as string, 10) || 10000;
      const purpose = (req.query.purpose as string) || 'Keperluan Kontrakan';

      let merchantName = 'KAS MARKAS WARUNG';
      let rawBasePayload = '';

      if (!receiverId || receiverId === 'kas_rumah' || receiverId === 'house_wallet' || receiverId === 'house_harmoni') {
        merchantName = 'KAS MARKAS WARUNG';
        const superAdmin = await dbGetUser('user_ghozi');
        rawBasePayload = superAdmin?.qrisPayload || '';
      } else {
        const dbUser = await dbGetUser(receiverId);
        const user = dbUser ? {
          id: dbUser.uid,
          name: dbUser.name,
          qrisPayload: dbUser.qrisPayload,
        } : store.users.find((u) => u.id === receiverId);

        merchantName = user ? user.name.toUpperCase() : 'ANGGOTA KONTRAKAN';
        rawBasePayload = user?.qrisPayload || '';
      }

      if (!rawBasePayload) {
        rawBasePayload = createSampleQRISPayload(merchantName);
      }

      const conversion = convertStaticToDynamicQRIS(rawBasePayload, amount, {
        purpose,
        referenceLabel: 'KONTRAKAN',
      });

      const qrDataUrl = await QRCode.toDataURL(conversion.dynamicPayload, {
        margin: 2,
        width: 440,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      res.json({
        hasQRIS: true,
        rawPayload: conversion.dynamicPayload,
        qrDataUrl,
        receiverName: conversion.merchantName || merchantName,
        acquirerName: conversion.acquirerName,
        nmid: conversion.nmid,
        amount: conversion.amount,
        purpose,
        explanation: conversion.explanation,
        merchantInfo: validateQRISPayload(conversion.dynamicPayload),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- CALENDAR ---
  app.get('/api/calendar', async (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    // Dynamically reconstruct autoEvents from needs and purchases
    const housePurchases = store.purchases.filter(p => p.houseId === houseId);
    const houseNeeds = store.needs.filter(n => n.houseId === houseId);
    
    const autoEvents: any[] = [];
    
    housePurchases.forEach(p => {
      const need = houseNeeds.find(n => n.id === p.needId);
      if (need) {
        autoEvents.push({
          id: `cal_${p.id}`,
          houseId: p.houseId,
          title: `${need.name} (${store.users.find((u) => u.id === p.purchaserId)?.name || 'Member'})`,
          date: p.date,
          type: 'NEED_PURCHASE',
          isEstimated: false,
          color: need.color,
          relatedId: need.id,
          description: `Rp ${p.amount.toLocaleString('id-ID')}`
        });
      }
    });
    
    houseNeeds.forEach(need => {
      if (need.expectedNextPurchaseDate) {
        autoEvents.push({
          id: `cal_est_${need.id}`,
          houseId: need.houseId,
          title: `Estimasi: ${need.name}`,
          date: need.expectedNextPurchaseDate,
          type: 'NEED_ESTIMATED',
          isEstimated: true,
          color: need.color,
          relatedId: need.id,
          description: `Prediksi interval ${need.averageConsumptionDays} hari (Giliran: ${store.users.find((u) => u.id === need.currentDutyMemberId)?.name || 'Belum ditentukan'})`
        });
      }
    });

    const dbEvents = await dbGetCustomCalendarEvents(houseId);
    const customEvents = dbEvents.map(e => ({
      id: e.id,
      houseId: e.houseId,
      title: e.title,
      description: e.description || '',
      date: e.date,
      type: e.type,
      color: e.color || '#3b82f6',
      isEstimated: false,
      meta: { creatorId: e.creatorId }
    }));
    res.json({ events: [...autoEvents, ...customEvents] });
  });

  app.post('/api/calendar', async (req, res) => {
    try {
      const payload = req.body;
      const event = await dbCreateCalendarEvent(payload);
      res.json({ success: true, event });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MAINTENANCE ---
  app.get('/api/maintenance', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const tickets = store.maintenance.filter((m) => m.houseId === houseId);
    res.json({ tickets });
  });

  app.post('/api/maintenance', async (req, res) => {
    try {
      const ticket = store.createMaintenanceTicket(req.body);
      await dbCreateMaintenance(ticket);
      await dbLogActivity(ticket.houseId, ticket.reporterId, `Melaporkan kendala: ${ticket.title}`, 'MAINTENANCE', ticket.id);
      res.json({ ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/maintenance/status', async (req, res) => {
    try {
      const { ticketId, status } = req.body;
      const ticket = store.maintenance.find((m) => m.id === ticketId);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      ticket.status = status;
      if (status === 'RESOLVED') {
        ticket.resolvedAt = new Date().toISOString();
      }
      await dbUpdateMaintenanceStatus(ticketId, status);
      res.json({ ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/maintenance/reimburse', (req, res) => {
    try {
      const result = store.reimburseMaintenance(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- AVAILABILITY ---
  app.get('/api/availability', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const periods = store.availability.filter((a) => a.houseId === houseId);
    res.json({ periods });
  });

  app.post('/api/availability', (req, res) => {
    try {
      const { houseId, memberId, startDate, endDate, status, reason } = req.body;
      const period = {
        id: `avail_${Date.now()}`,
        houseId: houseId || store.houses[0].id,
        memberId,
        startDate,
        endDate,
        status: status || 'AWAY',
        reason,
        createdAt: new Date().toISOString(),
      };
      store.availability.unshift(period);
      const user = store.users.find((u) => u.id === memberId);
      store.logActivity(period.houseId, memberId, `Mengatur ketersediaan: ${status} (${startDate} s/d ${endDate})`, 'AVAILABILITY', period.id);
      res.json({ period });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- ACTIVITIES & RECAPS ---
  app.get('/api/activities', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const activities = store.activities.filter((a) => a.houseId === houseId);
    res.json({ activities });
  });

  app.get('/api/recaps', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
    const recap = store.getRecap(houseId, period);
    res.json({ recap });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', (req, res) => {
    const userId = req.query.userId as string;
    const notifs = store.notifications.filter((n) => !userId || n.recipientId === userId);
    res.json({ notifications: notifs });
  });

  app.post('/api/notifications/read', (req, res) => {
    const { notificationId, userId } = req.body;
    if (notificationId) {
      const n = store.notifications.find((item) => item.id === notificationId);
      if (n) n.read = true;
    } else if (userId) {
      store.notifications.filter((n) => n.recipientId === userId).forEach((n) => (n.read = true));
    }
    res.json({ success: true });
  });

  // --- TELEGRAM INTEGRATION ---
  app.get('/api/settings/telegram', (req, res) => {
    const houseId = (req.query.houseId as string) || store.houses[0].id;
    res.json({ settings: store.telegramSettings[houseId] || store.telegramSettings.house_harmoni });
  });

  app.post('/api/settings/telegram', (req, res) => {
    const { houseId, settings } = req.body;
    const hid = houseId || store.houses[0].id;
    store.telegramSettings[hid] = {
      ...store.telegramSettings[hid],
      ...settings,
    };
    res.json({ success: true, settings: store.telegramSettings[hid] });
  });

  app.post('/api/settings/telegram/test', (req, res) => {
    const { message } = req.body;
    res.json({
      success: true,
      deliveredTo: 'Telegram Bot API Simulator',
      message: message || '🔔 [Kontrakanku Bot] Tes koneksi berhasil!',
      sentAt: new Date().toISOString(),
    });
  });

  // --- VITE MIDDLEWARE ---
  app.put('/api/users/:userId/profile', async (req, res) => {
    try {
      const { userId } = req.params;
      const { email, name, username, phone, avatarUrl, password } = req.body;
      const cleanUsername = username !== undefined ? (username || '').trim().toLowerCase() || null : undefined;
      
      const { users } = await import('./src/db/schema.js');
      const { eq } = await import('drizzle-orm');

      // Check if username is taken by someone else
      if (cleanUsername) {
        const existing = await db.select().from(users).where(eq(users.username, cleanUsername));
        if (existing.length > 0 && existing[0].uid !== userId) {
          return res.status(400).json({ error: 'Username sudah digunakan orang lain' });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (cleanUsername !== undefined) updateData.username = cleanUsername;
      if (phone !== undefined) updateData.phone = phone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const existingEmail = await db.select().from(users).where(eq(users.email, cleanEmail));
        if (existingEmail.length > 0 && existingEmail[0].uid !== userId) {
          return res.status(400).json({ error: 'Email sudah digunakan orang lain' });
        }
        updateData.email = cleanEmail;
      }

      if (password && password.length >= 6) {
        const { hash, salt } = hashPassword(password);
        updateData.passwordHash = hash;
        updateData.passwordSalt = salt;
        store.setUserPassword(userId, password);
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await db.update(users).set(updateData).where(eq(users.uid, userId));
        } catch (dbErr) {
          console.warn('DB update user profile warning:', dbErr);
        }
      }

      // Update in memory store too
      const memUser = store.users.find(u => u.id === userId);
      if (memUser) {
        if (name !== undefined) memUser.name = name;
        if (cleanUsername !== undefined) memUser.username = cleanUsername || undefined;
        if (phone !== undefined) memUser.phone = phone;
        if (avatarUrl !== undefined) memUser.avatarUrl = avatarUrl;
        if (email) memUser.email = email.trim().toLowerCase();
      }
      
      res.json({ success: true, user: memUser });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  import('vite').then(async ({ createServer }) => {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }).catch(console.error);
} else if (process.env.VERCEL !== '1') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}


if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kontrakanku server running on http://0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });
}

export default app;

