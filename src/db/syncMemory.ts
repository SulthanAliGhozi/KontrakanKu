import { db } from './index.js';
import { store } from '../server/store.js';
import { maintenanceTasks, activities, calendarEvents, needs, users, houseMembers, houses } from './schema.js';

export async function syncDbToMemory() {
  try {
    const allUsers = await db.select().from(users);
    store.users = allUsers.map(u => ({
      id: u.uid,
      name: u.name,
      email: u.email,
      username: u.username || undefined,
      avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: u.phone || undefined,
      qrisPayload: u.qrisPayload || undefined,
    }));

    const allHouses = await db.select().from(houses);
    if (allHouses.length > 0) {
      store.houses = allHouses.map((h: any) => ({
        id: h.id,
        name: h.name,
        address: h.address || '',
        inviteCode: h.inviteCode || 'MARKASW',
        createdAt: h.createdAt ? h.createdAt.toISOString() : new Date().toISOString(),
      }));
    }

    const allTickets = await db.select().from(maintenanceTasks);
    store.maintenance = allTickets.map((t: any) => ({
      id: t.id,
      houseId: t.houseId,
      title: t.title,
      category: t.category as any,
      description: t.description || undefined,
      estimatedCost: t.costEstimate || 0,
      actualCost: t.actualCost || 0,
      status: t.status as any,
      reporterId: t.reporterId,
      assignedMemberId: t.assigneeId || undefined,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : undefined,
      reimbursementStatus: 'NONE',
    }));

    const allActs = await db.select().from(activities);
    store.activities = allActs.map((a: any) => ({
      id: a.id,
      houseId: a.houseId,
      actorId: a.actorId,
      action: a.action,
      entityType: a.entityType || '',
      entityId: a.entityId || '',
      metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
      timestamp: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
    }));

    const allNeeds = await db.select().from(needs);
    store.needs = allNeeds.map((n: any) => ({
      id: n.id,
      houseId: n.houseId,
      name: n.name,
      icon: n.icon,
      category: n.category as any,
      color: n.color,
      type: n.type as any,
      dutyEnabled: n.dutyEnabled ?? true,
      currentDutyMemberId: n.currentDutyMemberId || undefined,
      rotationLogic: n.rotationLogic || undefined,
      rotationParticipants: n.rotationParticipants ? JSON.parse(n.rotationParticipants) : undefined,
      status: n.status as any,
      averageConsumptionDays: n.averageConsumptionDays || 14,
      unit: n.unit || 'pcs',
      notes: n.notes || undefined,
      lastPurchaserId: n.lastPurchaserId || undefined,
      lastAmount: n.lastAmount || 0,
      lastPurchasedAt: n.lastPurchasedAt ? n.lastPurchasedAt.toISOString() : undefined,
      expectedNextPurchaseDate: n.expectedDepletedAt ? n.expectedDepletedAt.toISOString() : undefined,
      archived: n.archived || false,
    }));

    const allMembers = await db.select().from(houseMembers);
    const memberMap = new Map<string, any>();
    for (const m of allMembers) {
      const key = `${m.houseId}_${m.userId}`;
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          id: m.id.toString(),
          houseId: m.houseId,
          userId: m.userId,
          role: (m.role || 'MEMBER').toUpperCase() as any,
          joinedAt: m.joinedAt ? m.joinedAt.toISOString() : new Date().toISOString(),
        });
      }
    }
    store.members = Array.from(memberMap.values());

    // For now, this is enough to show Maintenance, Activities, and Users
    console.log(`Synced memory from DB: ${store.maintenance.length} tickets, ${store.activities.length} activities`);
  } catch (err) {
    console.error('Failed to sync db to memory:', err);
  }
}
