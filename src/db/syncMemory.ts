import { db } from './index.ts';
import { store } from '../server/store.ts';
import { maintenanceTasks, activities, calendarEvents, needs, splitBills, users } from './schema.ts';

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
      merchantName: u.merchantName || undefined,
    }));

    const allTickets = await db.select().from(maintenanceTasks);
    store.maintenance = allTickets.map((t: any) => ({
      id: t.id,
      houseId: t.houseId,
      title: t.title,
      category: t.category as any,
      description: t.description || undefined,
      costEstimate: t.costEstimate || undefined,
      actualCost: t.actualCost || undefined,
      status: t.status as any,
      reporterId: t.reporterId,
      assignedMemberId: t.assigneeId || undefined,
      date: t.date,
      resolvedAt: t.resolvedAt || undefined,
    }));

    const allActs = await db.select().from(activities);
    store.activities = allActs.map(a => ({
      id: a.id,
      houseId: a.houseId,
      type: a.type as any,
      actorId: a.actorId,
      targetId: a.targetId || undefined,
      targetName: a.targetName || undefined,
      description: a.description || undefined,
      timestamp: a.timestamp ? a.timestamp.toISOString() : new Date().toISOString(),
      amount: a.amount || undefined,
    }));

    const allNeeds = await db.select().from(needs);
    store.needs = allNeeds.map(n => ({
      id: n.id,
      houseId: n.houseId,
      name: n.name,
      type: n.type as any,
      priority: n.priority as any,
      status: n.status as any,
      requesterId: n.requesterId,
      assigneeId: n.assigneeId || undefined,
      estimatedCost: n.estimatedCost || undefined,
      clusterId: n.clusterId || undefined,
    }));

    // For now, this is enough to show Maintenance, Activities, and Users
    console.log(`Synced memory from DB: ${store.maintenance.length} tickets, ${store.activities.length} activities`);
  } catch (err) {
    console.error('Failed to sync db to memory:', err);
  }
}
