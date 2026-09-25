import { db } from './index.ts';
import {
  activities,
  expenses,
  houseMembers,
  houses,
  maintenanceTasks,
  needs,
  purchases,
  settlements,
  users,
  walletTransactions,
  calendarEvents,
} from './schema.ts';
import { and, desc, eq, or } from 'drizzle-orm';
import { INITIAL_HOUSES, INITIAL_MEMBERS } from '../server/db/initialData.ts';
import { hashPassword, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from './users.ts';

export async function seedInitialCloudSqlData() {
  try {
    // 1. Seed house (only if not existing)
    const existingHouses = await db.select().from(houses);
    if (existingHouses.length === 0) {
      for (const h of INITIAL_HOUSES) {
        await db.insert(houses).values({
          id: h.id,
          name: h.name,
          address: h.address,
          currency: 'IDR',
          rules: 'Jaga kebersihan, patuhi jadwal piket belanja, dan bayar split bill tepat waktu.',
        });
      }
    }

    // 2. Ensure Super Admin exists in Cloud SQL
    const { hash, salt } = hashPassword(SUPER_ADMIN_PASSWORD);
    const existingSuperAdmin = await db.select().from(users).where(
      or(eq(users.uid, 'user_ghozi'), eq(users.email, SUPER_ADMIN_EMAIL), eq(users.email, 's.a.ghozi@gmail.com'))
    );

    if (existingSuperAdmin.length === 0) {
      await db.insert(users).values({
        uid: 'user_ghozi',
        email: SUPER_ADMIN_EMAIL,
        name: 'Sulthan Ali Ghozi',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'super_admin',
        phone: '081234567890',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      });
    } else {
      await db.update(users)
        .set({
          email: SUPER_ADMIN_EMAIL,
          name: 'Sulthan Ali Ghozi',
          passwordHash: hash,
          passwordSalt: salt,
          role: 'super_admin',
        })
        .where(eq(users.uid, existingSuperAdmin[0].uid));
    }

    // 3. Ensure house member for Super Admin
    const existingMembers = await db.select().from(houseMembers).where(eq(houseMembers.userId, 'user_ghozi'));
    if (existingMembers.length === 0) {
      await db.insert(houseMembers).values({
        houseId: 'house_harmoni',
        userId: 'user_ghozi',
        role: 'super_admin',
        status: 'active',
      });
    }
  } catch (error) {
    console.warn('Initial seeding notice:', error);
  }
}

// --- USER & QRIS CLOUD SQL OPERATIONS ---
export async function dbUpdateUserQRIS(userId: string, qrisPayload: string, merchantName?: string) {
  try {
    const updateData: any = { qrisPayload };
    if (merchantName) {
      updateData.name = merchantName;
    }
    const result = await db.update(users)
      .set(updateData)
      .where(or(eq(users.uid, userId), eq(users.id, Number(userId) || -1)))
      ;
    return result[0];
  } catch (error) {
    console.error('dbUpdateUserQRIS failed:', error);
    throw new Error('Gagal menyimpan QRIS ke database Cloud SQL.', { cause: error });
  }
}

export async function dbGetUser(userId: string) {
  try {
    const res = await db.select().from(users).where(or(eq(users.uid, userId), eq(users.id, Number(userId) || -1)));
    return res[0] || null;
  } catch (error) {
    console.error('dbGetUser failed:', error);
    return null;
  }
}

export async function dbGetAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('dbGetAllUsers failed:', error);
    return [];
  }
}

// --- NEEDS OPERATIONS ---
export async function dbGetNeeds(houseId: string) {
  try {
    return await db.select().from(needs).where(eq(needs.houseId, houseId));
  } catch (error) {
    console.error('dbGetNeeds failed:', error);
    return [];
  }
}

export async function dbAddNeed(needData: any) {
  try {
    const res = await db.insert(needs).values({
      id: needData.id,
      houseId: needData.houseId || 'house_harmoni',
      name: needData.name,
      icon: needData.icon || 'package',
      category: needData.category || 'GROCERIES',
      color: needData.color || '#10b981',
      type: needData.type || 'CONSUMABLE',
      dutyEnabled: needData.dutyEnabled ?? true,
      currentDutyMemberId: needData.currentDutyMemberId || null,
      status: needData.status || 'AVAILABLE',
      averageConsumptionDays: Number(needData.averageConsumptionDays) || 7,
      unit: needData.unit || 'pcs',
      notes: needData.notes || '',
      lastAmount: Number(needData.lastAmount) || 0,
      lastPurchaserId: needData.lastPurchaserId || null,
      lastPurchasedAt: needData.lastPurchasedAt ? new Date(needData.lastPurchasedAt) : null,
      expectedDepletedAt: needData.expectedNextPurchaseDate ? new Date(needData.expectedNextPurchaseDate) : null,
      archived: Boolean(needData.archived),
    });
    return null;
  } catch (error) {
    console.error('dbAddNeed failed:', error);
    throw new Error('Gagal menyimpan kebutuhan ke database Cloud SQL.', { cause: error });
  }
}

export async function dbUpdateNeed(needId: string, updates: any) {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.dutyEnabled !== undefined) payload.dutyEnabled = updates.dutyEnabled;
    if (updates.currentDutyMemberId !== undefined) payload.currentDutyMemberId = updates.currentDutyMemberId;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.averageConsumptionDays !== undefined) payload.averageConsumptionDays = Number(updates.averageConsumptionDays);
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.lastAmount !== undefined) payload.lastAmount = Number(updates.lastAmount);
    if (updates.lastPurchaserId !== undefined) payload.lastPurchaserId = updates.lastPurchaserId;
    if (updates.lastPurchasedAt !== undefined) payload.lastPurchasedAt = updates.lastPurchasedAt ? new Date(updates.lastPurchasedAt) : null;
    if (updates.expectedNextPurchaseDate !== undefined) payload.expectedDepletedAt = updates.expectedNextPurchaseDate ? new Date(updates.expectedNextPurchaseDate) : null;
    if (updates.archived !== undefined) payload.archived = updates.archived;

    const res = await db.update(needs).set(payload).where(eq(needs.id, needId));
    return null;
  } catch (error) {
    console.error('dbUpdateNeed failed:', error);
    throw new Error('Gagal memperbarui kebutuhan di database Cloud SQL.', { cause: error });
  }
}

// --- PURCHASES OPERATIONS ---
export async function dbRecordPurchase(purchaseData: any) {
  try {
    const res = await db.insert(purchases).values({
      id: purchaseData.id,
      needId: purchaseData.needId,
      houseId: purchaseData.houseId || 'house_harmoni',
      purchaserId: purchaseData.purchaserId,
      date: purchaseData.date,
      amount: Math.round(Number(purchaseData.amount)),
      quantity: Number(purchaseData.quantity) || 1,
      unit: purchaseData.unit || 'pcs',
      notes: purchaseData.notes || '',
      dutyExecutionRef: purchaseData.dutyExecutionRef || null,
    });
    return null;
  } catch (error) {
    console.error('dbRecordPurchase failed:', error);
    throw new Error('Gagal menyimpan riwayat pembelian ke database Cloud SQL.', { cause: error });
  }
}

export async function dbGetPurchases(houseId: string) {
  try {
    return await db.select().from(purchases).where(eq(purchases.houseId, houseId)).orderBy(desc(purchases.createdAt));
  } catch (error) {
    console.error('dbGetPurchases failed:', error);
    return [];
  }
}

// --- EXPENSES & SPLIT BILLS ---
export async function dbCreateExpense(expenseData: any) {
  try {
    const res = await db.insert(expenses).values({
      id: expenseData.id,
      houseId: expenseData.houseId || 'house_harmoni',
      title: expenseData.title,
      amount: Math.round(Number(expenseData.amount)),
      payerId: expenseData.payerId,
      category: expenseData.category || 'GENERAL',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      splitType: expenseData.splitType || 'EQUAL',
      status: expenseData.status || 'OPEN',
      participants: expenseData.participants ? JSON.stringify(expenseData.participants) : null,
      notes: expenseData.notes || '',
    });
    return null;
  } catch (error) {
    console.error('dbCreateExpense failed:', error);
    throw new Error('Gagal mencatat split bill ke database Cloud SQL.', { cause: error });
  }
}

export async function dbGetExpenses(houseId: string) {
  try {
    return await db.select().from(expenses).where(eq(expenses.houseId, houseId)).orderBy(desc(expenses.createdAt));
  } catch (error) {
    console.error('dbGetExpenses failed:', error);
    return [];
  }
}

// --- MAINTENANCE OPERATIONS ---
export async function dbCreateMaintenance(ticketData: any) {
  try {
    const res = await db.insert(maintenanceTasks).values({
      id: ticketData.id,
      houseId: ticketData.houseId || 'house_harmoni',
      title: ticketData.title,
      category: ticketData.category || 'GENERAL',
      description: ticketData.description || '',
      costEstimate: Math.round(Number(ticketData.costEstimate || ticketData.estimatedCost || 0)),
      actualCost: Math.round(Number(ticketData.actualCost || 0)),
      status: ticketData.status || 'OPEN',
      reporterId: ticketData.reporterId,
      assigneeId: ticketData.assigneeId || ticketData.assignedMemberId || null,
      date: ticketData.date || new Date().toISOString().split('T')[0],
    });
    return null;
  } catch (error) {
    console.error('dbCreateMaintenance failed:', error);
    throw new Error('Gagal membuat tiket pemeliharaan di Cloud SQL.', { cause: error });
  }
}

export async function dbUpdateMaintenanceStatus(ticketId: string, status: string, actualCost?: number) {
  try {
    const payload: any = { status };
    if (status === 'RESOLVED') {
      payload.resolvedAt = new Date();
    }
    if (actualCost !== undefined) {
      payload.actualCost = Math.round(Number(actualCost));
    }
    const res = await db.update(maintenanceTasks).set(payload).where(eq(maintenanceTasks.id, ticketId));
    return null;
  } catch (error) {
    console.error('dbUpdateMaintenanceStatus failed:', error);
    throw new Error('Gagal memperbarui status pemeliharaan di Cloud SQL.', { cause: error });
  }
}

export async function dbGetMaintenance(houseId: string) {
  try {
    return await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.houseId, houseId)).orderBy(desc(maintenanceTasks.createdAt));
  } catch (error) {
    console.error('dbGetMaintenance failed:', error);
    return [];
  }
}

// --- SETTLEMENTS ---
export async function dbCreateSettlement(settlementData: any) {
  try {
    const res = await db.insert(settlements).values({
      id: settlementData.id,
      houseId: settlementData.houseId || 'house_harmoni',
      debtorId: settlementData.debtorId,
      creditorId: settlementData.creditorId,
      amount: Math.round(Number(settlementData.amount)),
      status: settlementData.status || 'PAYMENT_SUBMITTED',
      notes: settlementData.notes || '',
    });
    return null;
  } catch (error) {
    console.error('dbCreateSettlement failed:', error);
    throw new Error('Gagal mencatat settlement di Cloud SQL.', { cause: error });
  }
}

export async function dbConfirmSettlement(settlementId: string) {
  try {
    const res = await db.update(settlements)
      .set({ status: 'CONFIRMED', confirmedAt: new Date() })
      .where(eq(settlements.id, settlementId))
      ;
    return null;
  } catch (error) {
    console.error('dbConfirmSettlement failed:', error);
    throw new Error('Gagal mengonfirmasi settlement di Cloud SQL.', { cause: error });
  }
}

export async function dbGetSettlements(houseId: string) {
  try {
    return await db.select().from(settlements).where(eq(settlements.houseId, houseId)).orderBy(desc(settlements.createdAt));
  } catch (error) {
    console.error('dbGetSettlements failed:', error);
    return [];
  }
}

// --- WALLET TRANSACTIONS ---
export async function dbCreateWalletTx(txData: any) {
  try {
    const res = await db.insert(walletTransactions).values({
      id: txData.id,
      houseId: txData.houseId || 'house_harmoni',
      actorId: txData.actorId,
      type: txData.type,
      amount: Math.round(Number(txData.amount)),
      description: txData.description,
      category: txData.category || 'GENERAL',
    });
    return null;
  } catch (error) {
    console.error('dbCreateWalletTx failed:', error);
    return null;
  }
}

export async function dbGetWalletTxs(houseId: string) {
  try {
    return await db.select().from(walletTransactions).where(eq(walletTransactions.houseId, houseId)).orderBy(desc(walletTransactions.createdAt));
  } catch (error) {
    console.error('dbGetWalletTxs failed:', error);
    return [];
  }
}

// --- ACTIVITIES ---
export async function dbLogActivity(houseId: string, actorId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
  try {
    const res = await db.insert(activities).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId: houseId || 'house_harmoni',
      actorId,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    return null;
  } catch (error) {
    console.warn('dbLogActivity failed:', error);
    return null;
  }
}

export async function dbGetActivities(houseId: string) {
  try {
    return await db.select().from(activities).where(eq(activities.houseId, houseId)).orderBy(desc(activities.createdAt));
  } catch (error) {
    console.error('dbGetActivities failed:', error);
    return [];
  }
}

export async function getHouseWithDetails(houseId: string) {
  try {
    const houseList = await db.select().from(houses).where(eq(houses.id, houseId));
    const house = houseList[0] || null;
    const members = await db.select().from(houseMembers).where(eq(houseMembers.houseId, houseId));
    const houseNeeds = await db.select().from(needs).where(eq(needs.houseId, houseId));
    const housePurchases = await db.select().from(purchases).where(eq(purchases.houseId, houseId));
    return { house, members, needs: houseNeeds, purchases: housePurchases };
  } catch (error) {
    console.error('Failed to get house with details:', error);
    throw new Error('Database query failed for house details.', { cause: error });
  }
}

export async function dbCreateCalendarEvent(eventData: any) {
  try {
    const res = await db.insert(calendarEvents).values({
      id: eventData.id,
      houseId: eventData.houseId || 'house_harmoni',
      title: eventData.title,
      description: eventData.description || '',
      date: eventData.date,
      type: eventData.type || 'HOUSE_EVENT',
      color: eventData.color || '#3b82f6',
      creatorId: eventData.creatorId,
    });
    return {
      id: eventData.id,
      houseId: eventData.houseId || 'house_harmoni',
      title: eventData.title,
      description: eventData.description || '',
      date: eventData.date,
      type: eventData.type || 'HOUSE_EVENT',
      color: eventData.color || '#3b82f6',
      creatorId: eventData.creatorId,
    };
    return null;
  } catch (error) {
    console.error('dbCreateCalendarEvent failed:', error);
    throw new Error('Gagal mencatat agenda kalender di Cloud SQL.', { cause: error });
  }
}

export async function dbGetCustomCalendarEvents(houseId: string) {
  try {
    return await db.select().from(calendarEvents).where(eq(calendarEvents.houseId, houseId)).orderBy(desc(calendarEvents.createdAt));
  } catch (error) {
    console.error('dbGetCustomCalendarEvents failed:', error);
    return [];
  }
}
