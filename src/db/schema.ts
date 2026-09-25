import { relations } from 'drizzle-orm';
import { boolean, int, mysqlTable, serial, varchar, timestamp, text } from 'drizzle-orm/mysql-core';

// Users table (Cloud SQL persistent users)
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  uid: varchar('uid', { length: 255 }).notNull().unique(), // Unique user identifier (e.g. user_ghozi)
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  passwordSalt: varchar('password_salt', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 255 }),
  role: varchar('role', { length: 255 }).default('member'),
  qrisPayload: varchar('qris_payload', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Houses table
export const houses = mysqlTable('houses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  currency: varchar('currency', { length: 255 }).default('IDR'),
  rules: varchar('rules', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// House Members table
export const houseMembers = mysqlTable('house_members', {
  id: int('id').autoincrement().primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).default('member').notNull(),
  status: varchar('status', { length: 255 }).default('active').notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Needs entity
export const needs = mysqlTable('needs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  color: varchar('color', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  dutyEnabled: boolean('duty_enabled').default(true),
  currentDutyMemberId: varchar('current_duty_member_id', { length: 255 }),
  status: varchar('status', { length: 255 }).default('AVAILABLE').notNull(),
  urgencyScore: int('urgency_score').default(0),
  averageConsumptionDays: int('average_consumption_days').default(14),
  unit: varchar('unit', { length: 255 }).default('pcs'),
  notes: varchar('notes', { length: 255 }),
  lastPurchaserId: varchar('last_purchaser_id', { length: 255 }),
  lastAmount: int('last_amount').default(0),
  lastPurchasedAt: timestamp('last_purchased_at'),
  expectedDepletedAt: timestamp('expected_depleted_at'),
  archived: boolean('archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Purchases event system
export const purchases = mysqlTable('purchases', {
  id: varchar('id', { length: 255 }).primaryKey(),
  needId: varchar('need_id', { length: 255 }).references(() => needs.id).notNull(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  purchaserId: varchar('purchaser_id', { length: 255 }).notNull(),
  date: varchar('date', { length: 255 }).notNull(),
  amount: int('amount').notNull(),
  quantity: int('quantity').default(1),
  unit: varchar('unit', { length: 255 }).default('pcs'),
  notes: varchar('notes', { length: 255 }),
  dutyExecutionRef: varchar('duty_execution_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Expenses & Split bills
export const expenses = mysqlTable('expenses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  amount: int('amount').notNull(),
  payerId: varchar('payer_id', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  date: varchar('date', { length: 255 }).notNull(),
  splitType: varchar('split_type', { length: 255 }).default('EQUAL'),
  status: varchar('status', { length: 255 }).default('OPEN').notNull(),
  participants: varchar('participants', { length: 255 }), // JSON string: [{memberId, amount, isPaid, paidAt}]
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Maintenance tasks
export const maintenanceTasks = mysqlTable('maintenance_tasks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  costEstimate: int('cost_estimate').default(0),
  actualCost: int('actual_cost').default(0),
  status: varchar('status', { length: 255 }).default('OPEN').notNull(),
  reporterId: varchar('reporter_id', { length: 255 }).notNull(),
  assigneeId: varchar('assignee_id', { length: 255 }),
  date: varchar('date', { length: 255 }).notNull(),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Settlements
export const settlements = mysqlTable('settlements', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  debtorId: varchar('debtor_id', { length: 255 }).notNull(),
  creditorId: varchar('creditor_id', { length: 255 }).notNull(),
  amount: int('amount').notNull(),
  status: varchar('status', { length: 255 }).default('PENDING').notNull(), // PENDING, PAYMENT_SUBMITTED, CONFIRMED
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
});

// Wallet Transactions
export const walletTransactions = mysqlTable('wallet_transactions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(), // INCOME, EXPENSE, REIMBURSEMENT
  amount: int('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).default('GENERAL'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activities
export const activities = mysqlTable('activities', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  entityType: varchar('entity_type', { length: 255 }),
  entityId: varchar('entity_id', { length: 255 }),
  metadata: varchar('metadata', { length: 255 }), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const housesRelations = relations(houses, ({ many }) => ({
  members: many(houseMembers),
  needs: many(needs),
  purchases: many(purchases),
  expenses: many(expenses),
  maintenance: many(maintenanceTasks),
  settlements: many(settlements),
  walletTransactions: many(walletTransactions),
  activities: many(activities),
}));

export const needsRelations = relations(needs, ({ one, many }) => ({
  house: one(houses, {
    fields: [needs.houseId],
    references: [houses.id],
  }),
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  need: one(needs, {
    fields: [purchases.needId],
    references: [needs.id],
  }),
  house: one(houses, {
    fields: [purchases.houseId],
    references: [houses.id],
  }),
}));

// Custom Calendar Events
export const calendarEvents = mysqlTable('calendar_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  houseId: varchar('house_id', { length: 255 }).references(() => houses.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  date: varchar('date', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).default('HOUSE_EVENT').notNull(),
  color: varchar('color', { length: 255 }).default('#3b82f6'),
  creatorId: varchar('creator_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
