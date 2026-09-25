import {
  Activity,
  AvailabilityPeriod,
  CalendarEvent,
  DutyLedgerEntry,
  House,
  HouseMember,
  HouseNotification,
  HouseWallet,
  MaintenanceTicket,
  MonthlyContribution,
  Need,
  NeedCluster,
  NeedPurchase,
  Settlement,
  SplitBill,
  TelegramSettings,
  User,
  WalletTransaction,
} from '../../types/index.ts';

// ONLY Super Admin is initialized; no mock/demo users
export const INITIAL_USERS: User[] = [
  {
    id: 'user_ghozi',
    name: 'Sulthan Ali Ghozi',
    email: 'sa.ghozi@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    phone: '081234567890',
  },
];

export const INITIAL_HOUSES: House[] = [
  {
    id: 'house_harmoni',
    name: 'KONTRAKAN MARKAS WARUNG',
    address: 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Kec. Bojongsoang, Kabupaten Bandung, Jawa Barat 40287',
    inviteCode: 'MARKASW',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_MEMBERS: HouseMember[] = [
  { id: 'm_ghozi', houseId: 'house_harmoni', userId: 'user_ghozi', role: 'SUPER_ADMIN', joinedAt: '2026-01-01T00:00:00Z' },
];

export const INITIAL_CLUSTERS: NeedCluster[] = [];

// Empty initial state: user creates real items
export const INITIAL_NEEDS: Need[] = [];
export const INITIAL_PURCHASES: NeedPurchase[] = [];
export const INITIAL_DUTY_LEDGER: DutyLedgerEntry[] = [];

export const INITIAL_WALLET: HouseWallet = {
  id: 'wallet_harmoni',
  houseId: 'house_harmoni',
  name: 'Kas Utama Harmoni',
  balance: 0,
  updatedAt: new Date().toISOString(),
};

export const INITIAL_WALLET_TXS: WalletTransaction[] = [];
export const INITIAL_CONTRIBUTIONS: MonthlyContribution[] = [];
export const INITIAL_SPLIT_BILLS: SplitBill[] = [];
export const INITIAL_SETTLEMENTS: Settlement[] = [];
export const INITIAL_MAINTENANCE: MaintenanceTicket[] = [];
export const INITIAL_AVAILABILITY: AvailabilityPeriod[] = [];
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_NOTIFICATIONS: HouseNotification[] = [];

export const INITIAL_TELEGRAM: TelegramSettings = {
  botToken: '',
  chatId: '',
  enabled: false,
  notifyOnDuty: true,
  notifyOnPurchase: true,
  notifyOnSplitBill: true,
  notifyOnMaintenance: true,
};
