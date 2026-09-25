import {
  Activity,
  CalendarEvent,
  House,
  HouseMember,
  HouseNotification,
  HouseWallet,
  MaintenanceTicket,
  Need,
  NeedCluster,
  NeedPurchase,
  NetBalancePosition,
  Settlement,
  SettlementPlanItem,
  SplitBill,
  TelegramSettings,
  User,
  WalletTransaction,
} from '../types';

export interface CommandState {
  house: House;
  members: (HouseMember & { user?: User })[];
  clusters: NeedCluster[];
  needs: Need[];
  wallet: HouseWallet;
  netBalances: NetBalancePosition[];
  settlementPlan: SettlementPlanItem[];
  actionItems: {
    id: string;
    type: 'DUTY' | 'UNPAID_SPLIT' | 'CONFIRM_SETTLEMENT' | 'MAINTENANCE';
    title: string;
    description: string;
    urgency: 'HIGH' | 'MEDIUM';
    link: string;
    data?: any;
  }[];
  activeMaintenance: MaintenanceTicket[];
  recentActivities: Activity[];
  unreadNotificationsCount: number;
  currentUser: User;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  async getCurrentState(houseId?: string, userId?: string): Promise<CommandState> {
    const params = new URLSearchParams();
    if (houseId) params.append('houseId', houseId);
    if (userId) params.append('userId', userId);
    const res = await fetch(API_BASE_URL + `/api/current-state?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil data rumah');
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(API_BASE_URL + '/api/users');
    const data = await res.json();
    return data.users;
  },

  async getNeeds(houseId: string): Promise<Need[]> {
    const res = await fetch(API_BASE_URL + `/api/needs?houseId=${houseId}`);
    const data = await res.json();
    return data.needs;
  },

  async getNeedDetail(needId: string): Promise<any> {
    const res = await fetch(API_BASE_URL + `/api/needs/${needId}`);
    if (!res.ok) throw new Error('Kebutuhan tidak ditemukan');
    return res.json();
  },

  async createNeed(payload: Partial<Need> & { actorId?: string }): Promise<Need> {
    const res = await fetch(API_BASE_URL + '/api/needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal membuat kebutuhan');
    }
    const data = await res.json();
    return data.need;
  },

  async updateNeed(needId: string, payload: Partial<Need> & { actorId?: string }): Promise<Need> {
    const res = await fetch(API_BASE_URL + `/api/needs/${needId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui kebutuhan');
    }
    const data = await res.json();
    return data.need;
  },

  async archiveNeed(needId: string, archived: boolean = true, actorId?: string): Promise<Need> {
    const res = await fetch(API_BASE_URL + `/api/needs/${needId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived, actorId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal mengubah status arsip kebutuhan');
    }
    const data = await res.json();
    return data.need;
  },

  async configureNeed(needId: string, payload: any): Promise<Need> {
    const res = await fetch(API_BASE_URL + `/api/needs/${needId}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menyimpan konfigurasi kebutuhan');
    }
    const data = await res.json();
    return data.need;
  },

  async login(email: string, password?: string): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal masuk');
    }
    return res.json();
  },

  async register(name: string, email: string, phone?: string, password?: string): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal mendaftar');
    }
    return res.json();
  },

  async getUserQRIS(userId: string): Promise<any> {
    const res = await fetch(API_BASE_URL + `/api/users/${userId}/qris`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memuat QRIS pengguna');
    }
    return res.json();
  },

  async updateUserQRIS(userId: string, qrisPayload: string, merchantName?: string): Promise<any> {
    const res = await fetch(API_BASE_URL + `/api/users/${userId}/qris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrisPayload, merchantName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui QRIS');
    }
    return res.json();
  },

  // --- HOUSE & MEMBER MANAGEMENT ---
  async createHouse(payload: { name: string; address?: string; creatorUserId: string }): Promise<{ house: House; member: HouseMember }> {
    const res = await fetch(API_BASE_URL + '/api/houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat kontrakan baru');
    }
    return res.json();
  },

  async getUserHouses(userId?: string): Promise<{ house: House; role: string; memberId: string; memberCount: number }[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    const res = await fetch(API_BASE_URL + `/api/user-houses?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil daftar kontrakan');
    const data = await res.json();
    return data.userHouses;
  },

  async addHouseMember(houseId: string, payload: { userId: string; role?: string }): Promise<HouseMember> {
    const res = await fetch(API_BASE_URL + `/api/houses/${houseId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menambahkan anggota');
    }
    const data = await res.json();
    return data.member;
  },

  async updateHouseMemberRole(houseId: string, memberId: string, role: string): Promise<HouseMember> {
    const res = await fetch(API_BASE_URL + `/api/houses/${houseId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Gagal mengubah peran anggota');
    const data = await res.json();
    return data.member;
  },

  async removeHouseMember(houseId: string, memberId: string): Promise<boolean> {
    const res = await fetch(API_BASE_URL + `/api/houses/${houseId}/members/${memberId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus anggota');
    const data = await res.json();
    return data.success;
  },

  async joinHouseByInvite(payload: { inviteCode: string; userId: string }): Promise<{ house: House; member: HouseMember }> {
    const res = await fetch(API_BASE_URL + '/api/houses/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal bergabung dengan kontrakan');
    }
    return res.json();
  },

  async recordPurchase(payload: {
    houseId: string;
    needId: string;
    purchaserId: string;
    amount: number;
    quantity: number;
    unit: string;
    date: string;
    notes?: string;
  }): Promise<{ purchase: NeedPurchase; need: Need; nextDutyMemberId?: string }> {
    const res = await fetch(API_BASE_URL + '/api/needs/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mencatat pembelian');
    }
    return res.json();
  },

  async performDutyAction(payload: {
    needId: string;
    houseId: string;
    memberId: string;
    action: string;
    note?: string;
    transferToMemberId?: string;
  }): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/needs/duty-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal memperbarui giliran');
    return res.json();
  },

  async getFinanceOverview(houseId: string): Promise<any> {
    const res = await fetch(API_BASE_URL + `/api/finance/overview?houseId=${houseId}`);
    if (!res.ok) throw new Error('Gagal mengambil data keuangan');
    return res.json();
  },

  async createSplitBill(payload: any): Promise<SplitBill> {
    const res = await fetch(API_BASE_URL + '/api/finance/split-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat split bill');
    }
    const data = await res.json();
    return data.splitBill;
  },

  async submitSettlement(payload: any): Promise<Settlement> {
    const res = await fetch(API_BASE_URL + '/api/finance/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal mencatat pelunasan');
    const data = await res.json();
    return data.settlement;
  },

  async confirmSettlement(settlementId: string, actorId: string): Promise<Settlement> {
    const res = await fetch(API_BASE_URL + '/api/finance/settle/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId, actorId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengonfirmasi pelunasan');
    }
    const data = await res.json();
    return data.settlement;
  },

  async getDynamicQRIS(receiverId: string, amount: number, purpose?: string): Promise<any> {
    const purposeParam = purpose ? `&purpose=${encodeURIComponent(purpose)}` : '';
    const res = await fetch(API_BASE_URL + `/api/finance/qris-dynamic?receiverId=${receiverId}&amount=${amount}${purposeParam}`);
    if (!res.ok) throw new Error('Gagal membuat QRIS dinamis');
    return res.json();
  },

  async createWalletTx(payload: any): Promise<WalletTransaction> {
    const res = await fetch(API_BASE_URL + '/api/finance/wallet-tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal menambah transaksi kas');
    const data = await res.json();
    return data.transaction;
  },

  async payContribution(payload: { contributionId: string; paidAmount: number; actorId: string }): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/finance/contribution/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal mencatat iuran');
    return res.json();
  },

  async getCalendarEvents(houseId: string): Promise<CalendarEvent[]> {
    const res = await fetch(API_BASE_URL + `/api/calendar?houseId=${houseId}`);
    const data = await res.json();
    return data.events;
  },

  async createCalendarEvent(payload: { id: string, houseId: string, title: string, description?: string, date: string, type: string, color?: string, creatorId: string }): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Gagal menambah agenda');
    return res.json();
  },

  async getMaintenance(houseId: string): Promise<MaintenanceTicket[]> {
    const res = await fetch(API_BASE_URL + `/api/maintenance?houseId=${houseId}`);
    const data = await res.json();
    return data.tickets;
  },

  async createMaintenance(payload: any): Promise<MaintenanceTicket> {
    const res = await fetch(API_BASE_URL + '/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal melaporkan kerusakan');
    const data = await res.json();
    return data.ticket;
  },

  async createMaintenanceTicket(payload: any): Promise<MaintenanceTicket> {
    return this.createMaintenance(payload);
  },

  async updateMaintenanceStatus(ticketId: string, status: string): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/maintenance/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, status }),
    });
    return res.json();
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    return this.updateMaintenanceStatus(ticketId, status);
  },

  async reimburseMaintenance(payload: { ticketId: string; houseId: string; actorId: string; actualCost: number }): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/maintenance/reimburse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal mereimburse');
    return res.json();
  },

  async getAvailability(houseId: string): Promise<any[]> {
    const res = await fetch(API_BASE_URL + `/api/availability?houseId=${houseId}`);
    const data = await res.json();
    return data.periods;
  },

  async addAvailability(payload: any): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getActivities(houseId: string): Promise<Activity[]> {
    const res = await fetch(API_BASE_URL + `/api/activities?houseId=${houseId}`);
    const data = await res.json();
    return data.activities;
  },

  async getRecap(houseId: string, period: string): Promise<any> {
    const res = await fetch(API_BASE_URL + `/api/recaps?houseId=${houseId}&period=${period}`);
    const data = await res.json();
    return data.recap;
  },

  async getNotifications(userId: string): Promise<HouseNotification[]> {
    const res = await fetch(API_BASE_URL + `/api/notifications?userId=${userId}`);
    const data = await res.json();
    return data.notifications;
  },

  async markNotificationRead(id?: string, userId?: string): Promise<void> {
    await fetch(API_BASE_URL + '/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, userId }),
    });
  },

  async getTelegramSettings(houseId: string): Promise<TelegramSettings> {
    const res = await fetch(API_BASE_URL + `/api/settings/telegram?houseId=${houseId}`);
    const data = await res.json();
    return data.settings;
  },

  async saveTelegramSettings(houseId: string, settings: Partial<TelegramSettings>): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/settings/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, settings }),
    });
    return res.json();
  },

  async updateTelegramSettings(houseId: string, settings: Partial<TelegramSettings>): Promise<any> {
    return this.saveTelegramSettings(houseId, settings);
  },

  async sendTestTelegram(message: string): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/settings/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  async runDomainVerification(): Promise<any> {
    const res = await fetch(API_BASE_URL + '/api/domain/verify-tests');
    return res.json();
  },
};
