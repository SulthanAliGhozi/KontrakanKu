import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { store } from './src/server/store';
import { syncDbToMemory } from './src/db/syncMemory.ts';
import { runDomainUnitTests } from './src/domain/__tests__/engine.test';
import { calculateNetBalances, generateSettlementPlan } from './src/domain/netBalance';
import { injectQRISAmount, createSampleQRISPayload, validateQRISPayload, convertStaticToDynamicQRIS } from './src/domain/qrisEngine';
import { calculateConsumptionMetrics } from './src/domain/consumptionEngine';
import QRCode from 'qrcode';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers, findDbUserByEmail, registerDbUser, verifyPassword, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from './src/db/users.ts';
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
} from './src/db/houseData.ts';

async function startServer() {
  const app = express();
app.use(cors());
  // In production (Cloud Run), listen on the port specified by Cloud Run (process.env.PORT, typically 8080).
  // In development, the local dev container runs an nginx proxy on 8080 forwarding to 3000, so dev must bind to 3000.
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  app.use(express.json());

  // Initialize Cloud SQL data and synchronize active state
  try {
    await seedInitialCloudSqlData();
    await syncDbToMemory();
    const [dbUsers, dbNeeds, dbPurchases, dbExpenses, dbMaintenance, dbSettlements, dbWalletTxs, dbActivities] = await Promise.all([
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
      await seedInitialCloudSqlData();
      const dbUsers = await getUsers();
      res.json({ users: dbUsers });
    } catch (error: any) {
      console.error('Failed to fetch users from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat pengguna dari database' });
    }
  });

  app.get('/api/db/house', async (req, res) => {
    try {
      await seedInitialCloudSqlData();
      const houseId = (req.query.houseId as string) || 'house_harmoni';
      const details = await getHouseWithDetails(houseId);
      res.json(details);
    } catch (error: any) {
      console.error('Failed to fetch house details from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat detail kontrakan dari database' });
    }
  });

  app.get('/api/domain/verify-tests', (req, res) => {
    const testResult = runDomainUnitTests();
    res.json(testResult);
  });

  // --- HOUSES & USERS ---
  app.get('/api/houses', (req, res) => {
    res.json({ houses: store.houses });
  });

  app.post('/api/houses', (req, res) => {
    try {
      const { name, address, creatorUserId } = req.body;
      if (!name || !creatorUserId) {
        return res.status(400).json({ error: 'Nama kontrakan dan creatorUserId wajib diisi' });
      }
      const result = store.createHouse({ name, address, creatorUserId });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  app.patch('/api/houses/:id/members/:memberId', (req, res) => {
    try {
      const { role } = req.body;
      const member = store.updateHouseMemberRole(req.params.memberId, role);
      res.json({ member });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/houses/:id/members/:memberId', (req, res) => {
    try {
      const success = store.removeHouseMember(req.params.memberId);
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

  app.get('/api/users', (req, res) => {
    res.json({ users: store.users });
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

      // 1. Super Admin Authentication (sa.ghozi@gmail.com / s.a.ghozi@gmail.com)
      const isSuperAdminEmail = cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com';
      if (isSuperAdminEmail) {
        if (password !== SUPER_ADMIN_PASSWORD) {
          return res.status(401).json({ error: 'Kata sandi Super Admin tidak sesuai. Silakan periksa kembali kata sandi Anda.' });
        }
        const dbGhozi = await findDbUserByEmail('sa.ghozi@gmail.com');
        const memoryGhozi = store.findUserByEmail('sa.ghozi@gmail.com') || store.users.find(u => u.id === 'user_ghozi');
        authenticatedUser = {
          id: 'user_ghozi',
          name: 'Sulthan Ali Ghozi',
          email: 'sa.ghozi@gmail.com',
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
        token: `token_${authenticatedUser.id}_${Date.now()}`,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Gagal masuk ke akun' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, phone, password, username } = req.body;
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

      const isSuperAdminEmail = cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com';
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0];
      const uid = isSuperAdminEmail ? 'user_ghozi' : `user_${Date.now()}`;

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
      } catch (dbErr) {
        console.warn('Cloud SQL registerDbUser warning:', dbErr);
      }

      // 2. Insert into Memory Store
      const { user, member } = store.registerUser(cleanName, cleanEmail, phone, password);
      const isSuperAdmin = store.checkIsSuperAdmin(user.id);
      const isAdmin = store.checkIsAdmin(user.id);

      res.json({
        success: true,
        user,
        role: isSuperAdmin ? 'SUPER_ADMIN' : member.role,
        isAdmin,
        isSuperAdmin,
        house: store.houses[0],
        token: `token_${user.id}_${Date.now()}`,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Gagal mendaftar' });
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
        user: { ...updatedUser, qrisPayload: dbUpdated?.qrisPayload || qrisPayload },
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
  app.get('/api/current-state', (req, res) => {
    try {
      const houseId = (req.query.houseId as string) || store.houses[0].id;
      const currentUserId = (req.query.userId as string) || store.users[0].id;

      const house = store.houses.find((h) => h.id === houseId) || store.houses[0];
      const members = store.members
        .filter((m) => m.houseId === house.id)
        .map((m) => ({
          ...m,
          user: store.users.find((u) => u.id === m.userId),
        }));
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
        currentUser: store.users.find((u) => u.id === currentUserId) || store.users[0],
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
        actorId,
      } = req.body;

      const effectiveActorId = actorId || (req.headers['x-user-id'] as string) || store.users[0]?.id || 'user_ghozi';
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
      const actorId = req.body.actorId || (req.headers['x-user-id'] as string);
      if (actorId && !store.checkIsAdmin(actorId)) {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Admin yang dapat memperbarui barang kebutuhan.',
        });
      }
      const updated = store.updateNeed(req.params.id, req.body);
      await dbUpdateNeed(req.params.id, req.body);
      await dbLogActivity(updated.houseId, actorId || store.users[0]?.id || 'user_ghozi', `Memperbarui kebutuhan: ${updated.name}`, 'NEED', updated.id);
      res.json({ need: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/needs/:id/archive', async (req, res) => {
    try {
      const actorId = req.body.actorId || (req.headers['x-user-id'] as string);
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
        actorId || store.users[0]?.id || 'user_ghozi',
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
      const effectiveActorId = actorId || (req.headers['x-user-id'] as string);
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
      const { settlementId, actorId } = req.body;
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
      const { contributionId, paidAmount, actorId } = req.body;
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

        merchantName = user ? (user.merchantName || user.name.toUpperCase()) : 'ANGGOTA KONTRAKAN';
        rawBasePayload = user?.qrisPayload || '';
      }

      if (!rawBasePayload) {
        return res.status(404).json({
          error: `Pengguna ${merchantName} belum mengunggah QRIS statis pribadinya. Minta pemilik akun untuk mengunggah foto QRIS di menu 'QRIS Akun Saya'.`,
          hasQRIS: false,
          receiverName: merchantName,
        });
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
    const autoEvents = store.calendarEvents.filter((e) => e.houseId === houseId);
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = 
  app.put('/api/users/:userId/profile', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, username, phone } = req.body;
      const cleanUsername = (username || '').trim().toLowerCase() || null;
      
      // Check if username is taken by someone else
      if (cleanUsername) {
        const existing = await db.select().from(users).where(eq(users.username, cleanUsername));
        if (existing.length > 0 && existing[0].uid !== userId) {
          return res.status(400).json({ error: 'Username sudah digunakan orang lain' });
        }
      }

      
      const updateData: any = {
        name,
        username: cleanUsername,
        phone,
      };
      if (req.body.avatarUrl) {
         updateData.avatarUrl = req.body.avatarUrl;
      }
      if (req.body.password && req.body.password.length >= 6) {
         const { hashPassword } = require('./src/db/users.ts');
         const { hash, salt } = hashPassword(req.body.password);
         updateData.passwordHash = hash;
         updateData.passwordSalt = salt;
      }

      await db.update(users).set(updateData).where(eq(users.uid, userId));

      
      // Update in memory store too
      const memUser = store.users.find(u => u.id === userId);
      if (memUser) {
        memUser.name = name;
        memUser.username = cleanUsername || undefined;
        memUser.phone = phone;
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kontrakanku server running on http://0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });

  // In production, if Cloud Run sets PORT (e.g. 8080) and it differs from 3000,
  // also attempt to bind port 3000 for any internal proxies or legacy checks.
  if (PORT !== 3000) {
    try {
      const secondary = app.listen(3000, '0.0.0.0', () => {
        console.log(`Also listening on port 3000`);
      });
      secondary.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port 3000 in use, running on primary port ${PORT}`);
        } else {
          console.warn(`Secondary port 3000 error:`, err.message);
        }
      });
    } catch (e: any) {
      console.warn(`Could not start secondary listener on port 3000:`, e.message);
    }
  }
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
