export type UserRole = 'OWNER' | 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  avatarUrl: string;
  phone?: string;
  qrisPayload?: string;
  merchantName?: string;
}

export interface House {
  id: string;
  name: string;
  address: string;
  inviteCode: string;
  createdAt: string;
}

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  user?: User;
}

export type NeedCategory = 'GROCERIES' | 'UTILITIES' | 'HOUSEHOLD' | 'MAINTENANCE' | 'OTHER';
export type NeedStatus = 'AVAILABLE' | 'RUNNING_LOW' | 'EMPTY';

export interface Need {
  id: string; // UUID
  houseId: string; // UUID FK
  name: string;
  icon: string;
  category: NeedCategory;
  color: string;
  type: string; // CONSUMABLE | DURABLE
  dutyEnabled: boolean;
  clusterId?: string; // UUID FK
  averageConsumptionDays: number;
  expectedNextPurchaseDate?: string;
  archived?: boolean;
  unit?: string;
  thresholdDays?: number;
  lastPurchasedAt?: string;
  lastPurchaserId?: string; // UUID FK
  lastAmount: number;
  currentDutyMemberId?: string; // UUID FK
  status: NeedStatus;
  notes?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface NeedCluster {
  id: string;
  houseId: string;
  name: string;
  description?: string;
  memberIds: string[];
}

export interface NeedPurchase {
  id: string;
  needId: string;
  houseId: string;
  purchaserId: string;
  date: string;
  amount: number; // in IDR integer
  quantity: number;
  unit: string;
  notes?: string;
  dutyExecutionId?: string;
  dutyActionConfirmed?: boolean;
}

export type DutyAction = 'ASSIGN' | 'EXECUTE' | 'TRANSFER' | 'SKIP' | 'REPLACE';

export interface DutyLedgerEntry {
  id: string;
  needId: string;
  houseId: string;
  memberId: string;
  action: DutyAction;
  note?: string;
  createdAt: string;
  relatedPurchaseId?: string;
  transferToMemberId?: string;
}

export type WalletTxType = 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'REIMBURSEMENT';

export interface WalletTransaction {
  id: string;
  walletId: string;
  houseId: string;
  actorId: string;
  type: WalletTxType;
  amount: number; // positive integer, type dictates addition/subtraction
  description: string;
  category: string;
  relatedEntityId?: string;
  relatedEntityType?: 'MAINTENANCE' | 'CONTRIBUTION' | 'PURCHASE' | 'MANUAL';
  createdAt: string;
}

export interface HouseWallet {
  id: string;
  houseId: string;
  name: string;
  balance: number; // derived from transactions
  updatedAt: string;
}

export type ContributionStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface MonthlyContribution {
  id: string;
  houseId: string;
  memberId: string;
  month: string; // e.g. "2026-09"
  year: number;
  targetAmount: number;
  paidAmount: number;
  status: ContributionStatus;
  paidAt?: string;
}

export type SplitType = 'EQUAL_SPLIT' | 'SELECTED_SPLIT' | 'EXACT_SPLIT';

export interface SplitBillParticipant {
  memberId: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
}

export interface SplitBill {
  id: string;
  houseId: string;
  creatorId: string;
  payerId: string;
  title: string;
  totalAmount: number;
  splitType: SplitType;
  notes?: string;
  status: 'OPEN' | 'SETTLED';
  createdAt: string;
  participants: SplitBillParticipant[];
}

export type SettlementStatus = 
  | 'PENDING' 
  | 'PAYMENT_SUBMITTED' 
  | 'CONFIRMED' 
  | 'REJECTED' 
  | 'CANCELLED';

export interface Settlement {
  id: string;
  houseId: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  status: SettlementStatus;
  proofUrl?: string;
  qrisUsed?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type ReimbursementStatus = 'NONE' | 'REQUESTED' | 'REIMBURSED';

export interface MaintenanceTicket {
  id: string;
  houseId: string;
  reporterId: string;
  assignedMemberId?: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  estimatedCost: number;
  actualCost: number;
  reimbursementStatus: ReimbursementStatus;
  reimbursementTxId?: string;
  photos?: string[];
  createdAt: string;
  resolvedAt?: string;
}

export type AvailabilityStatus = 'ACTIVE' | 'AWAY' | 'BUSY';

export interface AvailabilityPeriod {
  id: string;
  houseId: string;
  memberId: string;
  startDate: string;
  endDate: string;
  status: AvailabilityStatus;
  reason?: string;
  createdAt: string;
}

export type CalendarEventType =
  | 'NEED_PURCHASE'
  | 'NEED_ESTIMATED'
  | 'DUTY'
  | 'SPLIT_BILL'
  | 'SETTLEMENT'
  | 'CONTRIBUTION'
  | 'MAINTENANCE'
  | 'HOUSE_EVENT';

export interface CalendarEvent {
  id: string;
  houseId: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  type: CalendarEventType;
  isEstimated: boolean; // true: lighter/dashed, false: solid
  color: string;
  relatedId?: string;
  description?: string;
  meta?: Record<string, unknown>;
}

export interface Activity {
  id: string;
  houseId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HouseNotification {
  id: string;
  houseId: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'DUTY' | 'FINANCE' | 'MAINTENANCE' | 'SYSTEM';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface AuditLog {
  id: string;
  houseId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
}

export interface TelegramSettings {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
  notifyOnDuty: boolean;
  notifyOnPurchase: boolean;
  notifyOnSplitBill: boolean;
  notifyOnMaintenance: boolean;
}

export interface SettlementPlanItem {
  debtorId: string;
  creditorId: string;
  amount: number;
}

export interface NetBalancePosition {
  memberId: string;
  netAmount: number; // positive = creditor, negative = debtor
}
