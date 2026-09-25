import {
  Activity,
  AuditLog,
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
  UserRole,
  WalletTransaction,
} from '../types';
import {
  INITIAL_ACTIVITIES,
  INITIAL_AVAILABILITY,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CLUSTERS,
  INITIAL_CONTRIBUTIONS,
  INITIAL_DUTY_LEDGER,
  INITIAL_HOUSES,
  INITIAL_MAINTENANCE,
  INITIAL_MEMBERS,
  INITIAL_NEEDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PURCHASES,
  INITIAL_SETTLEMENTS,
  INITIAL_SPLIT_BILLS,
  INITIAL_TELEGRAM,
  INITIAL_USERS,
  INITIAL_WALLET,
  INITIAL_WALLET_TXS,
} from './db/initialData';
import { calculateConsumptionMetrics } from '../domain/consumptionEngine';
import { selectNextDutyMember } from '../domain/dutyEngine';
import { calculateNetBalances, generateSettlementPlan } from '../domain/netBalance';
import { calculateSplitBill } from '../domain/splitBillValidator';
import { calculateWalletBalance } from '../domain/walletEngine';
import { createSampleQRISPayload } from '../domain/qrisEngine';
import crypto from 'crypto';

// Server Memory Database
class MemoryStore {
  users: User[] = [...INITIAL_USERS];
  houses: House[] = [...INITIAL_HOUSES];
  members: HouseMember[] = [...INITIAL_MEMBERS];
  clusters: NeedCluster[] = [...INITIAL_CLUSTERS];
  needs: Need[] = [...INITIAL_NEEDS];
  purchases: NeedPurchase[] = [...INITIAL_PURCHASES];
  dutyLedger: DutyLedgerEntry[] = [...INITIAL_DUTY_LEDGER];
  wallets: HouseWallet[] = [{ ...INITIAL_WALLET }];
  walletTxs: WalletTransaction[] = [...INITIAL_WALLET_TXS];
  contributions: MonthlyContribution[] = [...INITIAL_CONTRIBUTIONS];
  splitBills: SplitBill[] = [...INITIAL_SPLIT_BILLS];
  settlements: Settlement[] = [...INITIAL_SETTLEMENTS];
  maintenance: MaintenanceTicket[] = [...INITIAL_MAINTENANCE];
  availability: AvailabilityPeriod[] = [...INITIAL_AVAILABILITY];
  calendarEvents: CalendarEvent[] = [...INITIAL_CALENDAR_EVENTS];
  activities: Activity[] = [...INITIAL_ACTIVITIES];
  notifications: HouseNotification[] = [...INITIAL_NOTIFICATIONS];
  auditLogs: AuditLog[] = [];
  telegramSettings: Record<string, TelegramSettings> = {
    house_harmoni: { ...INITIAL_TELEGRAM },
  };

  // User password credentials store: userId -> { hash, salt }
  userCredentials: Map<string, { hash: string; salt: string }> = new Map();

  constructor() {
    this.initDefaultCredentials();
  }

  private initDefaultCredentials() {
    // Super Admin sa.ghozi@gmail.com
    const ghoziHash = this.hashPassword('GhoziSuperAdmin#2026!');
    this.userCredentials.set('user_ghozi', ghoziHash);

    // Other initial members
    for (const u of INITIAL_USERS) {
      if (u.id !== 'user_ghozi') {
        this.userCredentials.set(u.id, this.hashPassword('MarkasWarung2026!'));
      }
    }
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 1000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    if (!password || !hash || !salt) return false;
    const computed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return computed === hash;
  }

  setUserPassword(userId: string, passwordPlain: string) {
    this.userCredentials.set(userId, this.hashPassword(passwordPlain));
  }

  syncFromCloudSql(dbData: {
    users?: any[];
    needs?: any[];
    purchases?: any[];
    expenses?: any[];
    maintenance?: any[];
    settlements?: any[];
    walletTxs?: any[];
    activities?: any[];
  }) {
    if (dbData.users && dbData.users.length > 0) {
      this.users = dbData.users.map((u) => ({
        id: u.uid || `user_${u.id}`,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        phone: u.phone || '',
        qrisPayload: u.qrisPayload || '',
      }));
      for (const u of dbData.users) {
        if (u.passwordHash && u.passwordSalt) {
          this.userCredentials.set(u.uid || `user_${u.id}`, { hash: u.passwordHash, salt: u.passwordSalt });
        }
      }
    }
    if (dbData.needs) {
      this.needs = dbData.needs.map((n) => ({
        id: n.id,
        houseId: n.houseId,
        name: n.name,
        icon: n.icon,
        category: n.category,
        color: n.color,
        type: n.type,
        dutyEnabled: n.dutyEnabled,
        currentDutyMemberId: n.currentDutyMemberId,
        status: n.status,
        averageConsumptionDays: n.averageConsumptionDays,
        expectedNextPurchaseDate: n.expectedDepletedAt ? new Date(n.expectedDepletedAt).toISOString().split('T')[0] : undefined,
        lastPurchasedAt: n.lastPurchasedAt ? new Date(n.lastPurchasedAt).toISOString() : undefined,
        lastPurchaserId: n.lastPurchaserId,
        lastAmount: n.lastAmount,
        unit: n.unit || 'pcs',
        notes: n.notes || '',
        archived: n.archived || false,
      }));
    }
    if (dbData.purchases) {
      this.purchases = dbData.purchases.map((p) => ({
        id: p.id,
        needId: p.needId,
        houseId: p.houseId,
        purchaserId: p.purchaserId,
        date: p.date,
        amount: p.amount,
        quantity: p.quantity,
        unit: p.unit || 'pcs',
        notes: p.notes,
        dutyActionConfirmed: true,
      }));
    }
    if (dbData.expenses) {
      this.splitBills = dbData.expenses.map((e) => {
        let participants = [];
        try {
          participants = e.participants ? JSON.parse(e.participants) : [];
        } catch {}
        return {
          id: e.id,
          houseId: e.houseId,
          creatorId: e.payerId,
          payerId: e.payerId,
          title: e.title,
          totalAmount: e.amount,
          splitType: e.splitType || 'EQUAL_SPLIT',
          status: e.status || 'OPEN',
          notes: e.notes,
          createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
          participants,
        };
      });
    }
    if (dbData.maintenance) {
      this.maintenance = dbData.maintenance.map((m) => ({
        id: m.id,
        houseId: m.houseId,
        reporterId: m.reporterId,
        assignedMemberId: m.assigneeId,
        title: m.title,
        description: m.description,
        status: m.status,
        estimatedCost: m.costEstimate,
        actualCost: m.actualCost,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        resolvedAt: m.resolvedAt ? new Date(m.resolvedAt).toISOString() : undefined,
      }));
    }
    if (dbData.settlements) {
      this.settlements = dbData.settlements.map((s) => ({
        id: s.id,
        houseId: s.houseId,
        debtorId: s.debtorId,
        creditorId: s.creditorId,
        amount: s.amount,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      }));
    }
    if (dbData.walletTxs) {
      this.walletTxs = dbData.walletTxs.map((w) => ({
        id: w.id,
        walletId: 'wallet_harmoni',
        houseId: w.houseId,
        actorId: w.actorId,
        type: w.type,
        amount: w.amount,
        description: w.description,
        category: w.category,
        createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
      }));
      let bal = 0;
      for (const tx of this.walletTxs) {
        if (tx.type === 'INCOME') bal += tx.amount;
        else if (tx.type === 'EXPENSE' || tx.type === 'REIMBURSEMENT') bal -= tx.amount;
      }
      this.wallets[0].balance = bal;
    }
    if (dbData.activities) {
      this.activities = dbData.activities.map((a) => {
        let meta = undefined;
        try {
          meta = a.metadata ? JSON.parse(a.metadata) : undefined;
        } catch {}
        return {
          id: a.id,
          houseId: a.houseId,
          actorId: a.actorId,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          timestamp: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
          metadata: meta,
        };
      });
    }
  }

  findUserByEmail(email: string): User | undefined {
    const clean = (email || '').trim().toLowerCase();
    if (clean === 'sa.ghozi@gmail.com' || clean === 's.a.ghozi@gmail.com') {
      return this.users.find((u) => u.id === 'user_ghozi' || u.email.toLowerCase().includes('ghozi'));
    }
    return this.users.find((u) => u.email.toLowerCase() === clean || (u.username && u.username.toLowerCase() === clean));
  }

  verifyUserCredentials(email: string, passwordPlain: string): { success: boolean; user?: User; error?: string } {
    const user = this.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Akun dengan email ini belum terdaftar. Silakan lakukan pendaftaran terlebih dahulu.' };
    }

    const creds = this.userCredentials.get(user.id);
    if (!creds) {
      // If no stored credentials yet, allow setting or check super admin default
      if (user.id === 'user_ghozi') {
        const isGhoziDefault = passwordPlain === 'GhoziSuperAdmin#2026!';
        if (isGhoziDefault) {
          this.setUserPassword(user.id, passwordPlain);
          return { success: true, user };
        }
      }
      return { success: false, error: 'Kata sandi tidak valid atau belum diatur.' };
    }

    const isValid = this.verifyPassword(passwordPlain, creds.hash, creds.salt);
    if (!isValid) {
      return { success: false, error: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' };
    }

    return { success: true, user };
  }

  logActivity(
    houseId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ) {
    const act: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId,
      actorId,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.activities.unshift(act);
    return act;
  }

  logAudit(
    houseId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown
  ) {
    const audit: AuditLog = {
      id: `audit_${Date.now()}`,
      houseId,
      actorId,
      action,
      entityType,
      entityId,
      before,
      after,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(audit);
  }

  sendNotification(
    houseId: string,
    recipientId: string,
    title: string,
    message: string,
    type: 'DUTY' | 'FINANCE' | 'MAINTENANCE' | 'SYSTEM',
    link?: string
  ) {
    const notif: HouseNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId,
      recipientId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      link,
    };
    this.notifications.unshift(notif);
    return notif;
  }

  // --- RECORD PURCHASE (Unified Event Flow) ---
  recordPurchase(input: {
    houseId: string;
    needId: string;
    purchaserId: string;
    amount: number;
    quantity: number;
    unit: string;
    date: string;
    notes?: string;
  }): { purchase: NeedPurchase; need: Need; nextDutyMemberId?: string } {
    const need = this.needs.find((n) => n.id === input.needId && n.houseId === input.houseId);
    if (!need) throw new Error('Kebutuhan tidak ditemukan');

    const purchaseId = crypto.randomUUID();
    const newPurchase: NeedPurchase = {
      id: purchaseId,
      needId: input.needId,
      houseId: input.houseId,
      purchaserId: input.purchaserId,
      amount: Math.round(input.amount),
      quantity: input.quantity || 1,
      unit: input.unit || 'pcs',
      date: input.date || new Date().toISOString().split('T')[0],
      notes: input.notes,
      dutyActionConfirmed: true,
    };

    this.purchases.push(newPurchase);

    // 1. Log Duty Execution
    const dutyExecId = crypto.randomUUID();
    const dutyEntry: DutyLedgerEntry = {
      id: dutyExecId,
      needId: input.needId,
      houseId: input.houseId,
      memberId: input.purchaserId,
      action: 'EXECUTE',
      note: `Beli ${need.name} (Rp ${input.amount.toLocaleString('id-ID')})`,
      createdAt: new Date().toISOString(),
      relatedPurchaseId: purchaseId,
    };
    this.dutyLedger.push(dutyEntry);

    // 2. Recalculate Consumption & Prediction
    const needPurchases = this.purchases.filter((p) => p.needId === input.needId);
    const metrics = calculateConsumptionMetrics(needPurchases);

    // 3. Update Need
    need.lastPurchasedAt = newPurchase.date;
    need.lastPurchaserId = input.purchaserId;
    need.lastAmount = input.amount;
    need.status = 'AVAILABLE';
    if (metrics.hasSufficientData && metrics.averageIntervalDays) {
      need.averageConsumptionDays = metrics.averageIntervalDays;
      need.expectedNextPurchaseDate = metrics.estimatedNextPurchaseDate || undefined;
    }

    // 4. Select Next Duty Member
    const allMemberIds = this.members
      .filter((m) => m.houseId === input.houseId)
      .map((m) => m.userId);
    const nextMember = selectNextDutyMember(
      need,
      allMemberIds,
      this.clusters,
      this.availability,
      this.dutyLedger
    );

    if (nextMember) {
      need.currentDutyMemberId = nextMember;
      // Record next assignment
      this.dutyLedger.push({
        id: `dl_${Date.now()}_assign`,
        needId: input.needId,
        houseId: input.houseId,
        memberId: nextMember,
        action: 'ASSIGN',
        note: `Giliran otomatis berikutnya setelah ${input.purchaserId} membeli`,
        createdAt: new Date().toISOString(),
      });

      // Notify next member
      const purchaserUser = this.users.find((u) => u.id === input.purchaserId);
      this.sendNotification(
        input.houseId,
        nextMember,
        `Giliranmu: ${need.name}`,
        `${purchaserUser?.name || 'Seseorang'} baru saja mencatat pembelian ${need.name}. Giliran selanjutnya adalah kamu.`,
        'DUTY',
        `/kebutuhan/${need.id}`
      );
    }

    // 5. Update Calendar Events
    // Add actual purchase event
    this.calendarEvents.push({
      id: `cal_${purchaseId}`,
      houseId: input.houseId,
      title: `${need.name} (${this.users.find((u) => u.id === input.purchaserId)?.name || 'Member'})`,
      date: newPurchase.date,
      type: 'NEED_PURCHASE',
      isEstimated: false,
      color: need.color,
      relatedId: need.id,
      description: `Rp ${input.amount.toLocaleString('id-ID')}`,
    });

    // Update or create estimated next purchase event
    if (need.expectedNextPurchaseDate) {
      // Remove previous estimated event for this need
      this.calendarEvents = this.calendarEvents.filter(
        (e) => !(e.relatedId === need.id && e.type === 'NEED_ESTIMATED')
      );
      this.calendarEvents.push({
        id: `cal_est_${need.id}_${Date.now()}`,
        houseId: input.houseId,
        title: `Estimasi: ${need.name}`,
        date: need.expectedNextPurchaseDate,
        type: 'NEED_ESTIMATED',
        isEstimated: true,
        color: need.color,
        relatedId: need.id,
        description: `Prediksi interval ${need.averageConsumptionDays} hari (Giliran: ${
          this.users.find((u) => u.id === need.currentDutyMemberId)?.name || 'Belum ditentukan'
        })`,
      });
    }

    // 6. Log Activity
    const purchaser = this.users.find((u) => u.id === input.purchaserId);
    this.logActivity(
      input.houseId,
      input.purchaserId,
      `Membeli ${need.name} (Rp ${input.amount.toLocaleString('id-ID')})`,
      'NEED_PURCHASE',
      purchaseId,
      { needName: need.name, amount: input.amount }
    );

    return { purchase: newPurchase, need, nextDutyMemberId: nextMember || undefined };
  }

  // --- SPLIT BILL ---
  createSplitBill(input: {
    houseId: string;
    creatorId: string;
    payerId: string;
    title: string;
    totalAmount: number;
    splitType: 'EQUAL_SPLIT' | 'SELECTED_SPLIT' | 'EXACT_SPLIT';
    selectedMemberIds: string[];
    exactAmounts?: Record<string, number>;
    notes?: string;
  }): SplitBill {
    const validation = calculateSplitBill({
      totalAmount: input.totalAmount,
      splitType: input.splitType,
      payerId: input.payerId,
      selectedMemberIds: input.selectedMemberIds,
      exactAmounts: input.exactAmounts,
    });

    if (!validation.isValid) {
      throw new Error(validation.error || 'Pembagian tagihan tidak valid');
    }

    // Automatically mark payer's own share as paid
    const participants = validation.participants.map((p) => ({
      ...p,
      isPaid: p.memberId === input.payerId,
      paidAt: p.memberId === input.payerId ? new Date().toISOString() : undefined,
    }));

    const splitBill: SplitBill = {
      id: `sb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId: input.houseId,
      creatorId: input.creatorId,
      payerId: input.payerId,
      title: input.title,
      totalAmount: input.totalAmount,
      splitType: input.splitType,
      notes: input.notes,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      participants,
    };

    this.splitBills.unshift(splitBill);

    // Notify participants who owe money
    const payer = this.users.find((u) => u.id === input.payerId);
    for (const p of participants) {
      if (p.memberId !== input.payerId && !p.isPaid) {
        this.sendNotification(
          input.houseId,
          p.memberId,
          `Split Bill: ${input.title}`,
          `${payer?.name || 'Teman rumah'} menambahkan tagihan. Bagianmu: Rp ${p.amount.toLocaleString('id-ID')}`,
          'FINANCE',
          '/keuangan'
        );
      }
    }

    this.logActivity(
      input.houseId,
      input.creatorId,
      `Membuat Split Bill: ${input.title} (Rp ${input.totalAmount.toLocaleString('id-ID')})`,
      'SPLIT_BILL',
      splitBill.id,
      { totalAmount: input.totalAmount }
    );

    return splitBill;
  }

  // --- SETTLEMENT ---
  submitSettlement(input: {
    houseId: string;
    debtorId: string;
    creditorId: string;
    amount: number;
    proofUrl?: string;
    qrisUsed?: boolean;
    notes?: string;
  }): Settlement {
    const settlement: Settlement = {
      id: `settle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId: input.houseId,
      debtorId: input.debtorId,
      creditorId: input.creditorId,
      amount: Math.round(input.amount),
      status: 'PAYMENT_SUBMITTED',
      proofUrl: input.proofUrl,
      qrisUsed: input.qrisUsed ?? false,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.settlements.unshift(settlement);

    const debtor = this.users.find((u) => u.id === input.debtorId);
    this.sendNotification(
      input.houseId,
      input.creditorId,
      'Konfirmasi Pembayaran Diterima',
      `${debtor?.name || 'Penghuni'} telah mengirimkan pembayaran Rp ${input.amount.toLocaleString('id-ID')}. Mohon cek & konfirmasi penerimaan.`,
      'FINANCE',
      '/keuangan'
    );

    this.logActivity(
      input.houseId,
      input.debtorId,
      `Mengirim pelunasan Rp ${input.amount.toLocaleString('id-ID')}`,
      'SETTLEMENT',
      settlement.id,
      { amount: input.amount }
    );

    return settlement;
  }

  confirmSettlement(settlementId: string, actorId: string): Settlement {
    const s = this.settlements.find((item) => item.id === settlementId);
    if (!s) throw new Error('Settlement tidak ditemukan');

    if (s.creditorId !== actorId) {
      throw new Error('Hanya penerima (kreditor) yang berhak mengonfirmasi pelunasan.');
    }

    s.status = 'CONFIRMED';
    s.updatedAt = new Date().toISOString();

    const creditor = this.users.find((u) => u.id === s.creditorId);
    this.sendNotification(
      s.houseId,
      s.debtorId,
      'Pelunasan Terkonfirmasi',
      `${creditor?.name || 'Kreditor'} telah mengonfirmasi pembayaran Rp ${s.amount.toLocaleString('id-ID')}. Hutangmu telah impas.`,
      'FINANCE',
      '/keuangan'
    );

    this.logActivity(
      s.houseId,
      actorId,
      `Mengonfirmasi pelunasan Rp ${s.amount.toLocaleString('id-ID')}`,
      'SETTLEMENT',
      s.id,
      { amount: s.amount }
    );

    return s;
  }

  // --- HOUSE WALLET MUTATION ---
  createWalletTransaction(input: {
    walletId: string;
    houseId: string;
    actorId: string;
    type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'REIMBURSEMENT';
    amount: number;
    description: string;
    category: string;
    relatedEntityId?: string;
    relatedEntityType?: 'MAINTENANCE' | 'CONTRIBUTION' | 'PURCHASE' | 'MANUAL';
  }): WalletTransaction {
    const tx: WalletTransaction = {
      id: `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletId: input.walletId,
      houseId: input.houseId,
      actorId: input.actorId,
      type: input.type,
      amount: Math.round(input.amount),
      description: input.description,
      category: input.category,
      relatedEntityId: input.relatedEntityId,
      relatedEntityType: input.relatedEntityType,
      createdAt: new Date().toISOString(),
    };

    this.walletTxs.unshift(tx);

    // Update wallet cached balance
    const wallet = this.wallets.find((w) => w.id === input.walletId);
    if (wallet) {
      wallet.balance = calculateWalletBalance(this.walletTxs.filter((t) => t.walletId === wallet.id));
      wallet.updatedAt = new Date().toISOString();
    }

    this.logActivity(
      input.houseId,
      input.actorId,
      `Transaksi Kas: ${input.description} (${input.type === 'INCOME' ? '+' : '-'}Rp ${input.amount.toLocaleString('id-ID')})`,
      'WALLET',
      tx.id,
      { amount: input.amount, type: input.type }
    );

    return tx;
  }

  // --- MAINTENANCE & REIMBURSEMENT ---
  createMaintenanceTicket(input: {
    houseId: string;
    reporterId: string;
    assignedMemberId?: string;
    title: string;
    description: string;
    estimatedCost: number;
  }): MaintenanceTicket {
    const ticket: MaintenanceTicket = {
      id: `maint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      houseId: input.houseId,
      reporterId: input.reporterId,
      assignedMemberId: input.assignedMemberId,
      title: input.title,
      description: input.description,
      status: 'OPEN',
      estimatedCost: Math.round(input.estimatedCost || 0),
      actualCost: 0,
      reimbursementStatus: 'NONE',
      createdAt: new Date().toISOString(),
    };

    this.maintenance.unshift(ticket);

    this.logActivity(
      input.houseId,
      input.reporterId,
      `Melaporkan perbaikan: ${input.title}`,
      'MAINTENANCE',
      ticket.id,
      { title: input.title }
    );

    return ticket;
  }

  reimburseMaintenance(input: {
    ticketId: string;
    houseId: string;
    actorId: string;
    actualCost: number;
  }): { ticket: MaintenanceTicket; transaction: WalletTransaction } {
    const ticket = this.maintenance.find((m) => m.id === input.ticketId);
    if (!ticket) throw new Error('Tiket maintenance tidak ditemukan');

    ticket.actualCost = Math.round(input.actualCost);
    ticket.status = 'RESOLVED';
    ticket.resolvedAt = new Date().toISOString();
    ticket.reimbursementStatus = 'REIMBURSED';

    const wallet = this.wallets.find((w) => w.houseId === input.houseId);
    if (!wallet) throw new Error('Dompet kas rumah tidak ditemukan');

    // Create wallet transaction
    const tx = this.createWalletTransaction({
      walletId: wallet.id,
      houseId: input.houseId,
      actorId: input.actorId,
      type: 'REIMBURSEMENT',
      amount: input.actualCost,
      description: `Reimburse: ${ticket.title}`,
      category: 'MAINTENANCE',
      relatedEntityId: ticket.id,
      relatedEntityType: 'MAINTENANCE',
    });

    ticket.reimbursementTxId = tx.id;

    return { ticket, transaction: tx };
  }

  // --- RECAP GENERATOR ---
  getRecap(houseId: string, period: 'daily' | 'weekly' | 'monthly', customDate?: string) {
    const now = customDate ? new Date(customDate) : new Date();
    const housePurchases = this.purchases.filter((p) => p.houseId === houseId);
    const houseTxs = this.walletTxs.filter((t) => t.houseId === houseId);
    const houseActivities = this.activities.filter((a) => a.houseId === houseId);

    let startDate: Date;
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      // Monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredPurchases = housePurchases.filter(
      (p) => new Date(p.date).getTime() >= startDate.getTime()
    );
    const filteredTxs = houseTxs.filter(
      (t) => new Date(t.createdAt).getTime() >= startDate.getTime()
    );
    const filteredActivities = houseActivities.filter(
      (a) => new Date(a.timestamp).getTime() >= startDate.getTime()
    );

    const totalNeedSpending = filteredPurchases.reduce((acc, p) => acc + p.amount, 0);
    const totalWalletExpense = filteredTxs
      .filter((t) => t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalWalletIncome = filteredTxs
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    // Category distribution
    const categoryTotals: Record<string, number> = {};
    for (const p of filteredPurchases) {
      const need = this.needs.find((n) => n.id === p.needId);
      const cat = need?.category || 'OTHER';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + p.amount;
    }

    const activeMemberIds = new Set<string>();
    filteredPurchases.forEach((p) => activeMemberIds.add(p.purchaserId));
    filteredTxs.forEach((t) => activeMemberIds.add(t.actorId));

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalPurchasesCount: filteredPurchases.length,
      totalNeedSpending,
      totalWalletIncome,
      totalWalletExpense,
      totalHouseSpending: totalNeedSpending + totalWalletExpense,
      activeMembersCount: activeMemberIds.size,
      categoryDistribution: Object.entries(categoryTotals).map(([name, amount]) => ({
        name,
        amount,
      })),
      recentActivities: filteredActivities.slice(0, 10),
      purchases: filteredPurchases,
    };
  }

  // --- HOUSE & MEMBERS MANAGEMENT (UUIDs & Foreign Keys) ---
  createHouse(input: { name: string; address?: string; creatorUserId: string }): { house: House; member: HouseMember } {
    const houseId = crypto.randomUUID();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newHouse: House = {
      id: houseId,
      name: input.name,
      address: input.address || '',
      inviteCode,
      createdAt: new Date().toISOString(),
    };
    this.houses.push(newHouse);

    // Create Owner Member with UUID
    const memberId = crypto.randomUUID();
    const newMember: HouseMember = {
      id: memberId,
      houseId: houseId,
      userId: input.creatorUserId,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
    };
    this.members.push(newMember);

    // Create default house wallet with UUID
    this.wallets.push({
      id: crypto.randomUUID(),
      houseId: houseId,
      name: 'Kas Utama',
      balance: 0,
      updatedAt: new Date().toISOString(),
    });

    this.logActivity(houseId, input.creatorUserId, `Membuat rumah baru: ${input.name}`, 'HOUSE', houseId);

    return { house: newHouse, member: newMember };
  }

  getUserHouses(userId: string) {
    const userMemberships = this.members.filter((m) => m.userId === userId);
    return userMemberships
      .map((m) => {
        const house = this.houses.find((h) => h.id === m.houseId);
        const memberCount = this.members.filter((hm) => hm.houseId === m.houseId).length;
        return {
          house,
          role: m.role,
          memberId: m.id,
          memberCount,
        };
      })
      .filter((item): item is { house: House; role: UserRole; memberId: string; memberCount: number } => item.house !== undefined);
  }

  addHouseMember(input: { houseId: string; userId: string; role?: UserRole }): HouseMember {
    const house = this.houses.find((h) => h.id === input.houseId);
    if (!house) throw new Error('Rumah tidak ditemukan');

    const existing = this.members.find((m) => m.houseId === input.houseId && m.userId === input.userId);
    if (existing) throw new Error('Pengguna sudah menjadi anggota rumah ini');

    const newMember: HouseMember = {
      id: crypto.randomUUID(),
      houseId: input.houseId,
      userId: input.userId,
      role: input.role || 'MEMBER',
      joinedAt: new Date().toISOString(),
    };
    this.members.push(newMember);

    const user = this.users.find((u) => u.id === input.userId);
    this.logActivity(input.houseId, input.userId, `${user?.name || 'Anggota baru'} bergabung ke kontrakan`, 'MEMBER', newMember.id);

    return newMember;
  }

  updateHouseMemberRole(memberId: string, role: UserRole): HouseMember {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Anggota tidak ditemukan');
    member.role = role;
    return member;
  }

  removeHouseMember(memberId: string): boolean {
    const idx = this.members.findIndex((m) => m.id === memberId);
    if (idx === -1) return false;
    const removed = this.members.splice(idx, 1)[0];
    this.logActivity(removed.houseId, removed.userId, `Keluar dari kontrakan`, 'MEMBER', removed.id);
    return true;
  }

  joinHouseByInvite(inviteCode: string, userId: string): { house: House; member: HouseMember } {
    const house = this.houses.find((h) => h.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase());
    if (!house) throw new Error('Kode undangan rumah tidak valid');

    const existing = this.members.find((m) => m.houseId === house.id && m.userId === userId);
    if (existing) {
      return { house, member: existing };
    }

    const newMember: HouseMember = {
      id: crypto.randomUUID(),
      houseId: house.id,
      userId,
      role: 'MEMBER',
      joinedAt: new Date().toISOString(),
    };
    this.members.push(newMember);
    this.logActivity(house.id, userId, `Bergabung via kode undangan`, 'MEMBER', newMember.id);
    return { house, member: newMember };
  }

  // --- NEEDS CRUD & CONFIGURATION ---
  createNeed(input: {
    houseId: string;
    name: string;
    icon?: string;
    category?: any;
    color?: string;
    type?: string;
    dutyEnabled?: boolean;
    clusterId?: string;
    averageConsumptionDays?: number;
    expectedNextPurchaseDate?: string;
    unit?: string;
    thresholdDays?: number;
    notes?: string;
  }): Need {
    const newNeed: Need = {
      id: crypto.randomUUID(),
      houseId: input.houseId,
      name: input.name,
      icon: input.icon || 'package',
      category: input.category || 'GROCERIES',
      color: input.color || '#10b981',
      type: input.type || 'CONSUMABLE',
      dutyEnabled: input.dutyEnabled ?? true,
      clusterId: input.clusterId || undefined,
      averageConsumptionDays: input.averageConsumptionDays || 7,
      expectedNextPurchaseDate: input.expectedNextPurchaseDate,
      unit: input.unit || 'pcs',
      thresholdDays: input.thresholdDays || 2,
      archived: false,
      lastAmount: 0,
      status: 'AVAILABLE',
      notes: input.notes,
    };
    this.needs.push(newNeed);
    return newNeed;
  }

  updateNeed(id: string, updates: Partial<Need>): Need {
    const need = this.needs.find((n) => n.id === id);
    if (!need) throw new Error('Kebutuhan tidak ditemukan');
    Object.assign(need, updates);
    return need;
  }

  archiveNeed(id: string, archived: boolean = true): Need {
    const need = this.needs.find((n) => n.id === id);
    if (!need) throw new Error('Kebutuhan tidak ditemukan');
    need.archived = archived;
    return need;
  }

  // --- USER AUTH & QRIS HELPERS ---
  checkIsSuperAdmin(userId: string): boolean {
    if (userId === 'user_ghozi') return true;
    const user = this.users.find((u) => u.id === userId);
    const email = user?.email?.toLowerCase();
    if (email === 'sa.ghozi@gmail.com' || email === 's.a.ghozi@gmail.com') return true;
    const member = this.members.find((m) => m.userId === userId);
    return member?.role === 'SUPER_ADMIN';
  }

  checkIsAdmin(userId: string): boolean {
    if (this.checkIsSuperAdmin(userId)) return true;
    if (userId === 'user_ilaa') return true;
    const user = this.users.find((u) => u.id === userId);
    if (user?.email?.toLowerCase() === 'ilaaapedia@gmail.com') return true;
    const member = this.members.find((m) => m.userId === userId);
    return member?.role === 'ADMIN' || member?.role === 'OWNER' || member?.role === 'SUPER_ADMIN';
  }

  updateUserQRIS(userId: string, qrisPayload: string, merchantName?: string): User {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Pengguna tidak ditemukan');
    user.qrisPayload = qrisPayload;
    if (merchantName) {
      user.name = merchantName;
    }
    return user;
  }

  registerUser(name: string, email: string, phone?: string, password?: string): { user: User; member: HouseMember } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || ((cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com') && u.id === 'user_ghozi')
    );
    if (existing) {
      if (password) {
        this.setUserPassword(existing.id, password);
      }
      const existingMember = this.members.find((m) => m.userId === existing.id);
      return { user: existing, member: existingMember || this.members[0] };
    }

    const userId = `user_${Date.now()}`;
    const cleanName = name.trim() || cleanEmail.split('@')[0];
    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      phone: phone || '',
      qrisPayload: createSampleQRISPayload(cleanName.toUpperCase()),
    };
    this.users.push(newUser);
    if (password) {
      this.setUserPassword(userId, password);
    }

    const houseId = this.houses[0]?.id || 'house_harmoni';
    const isSuperAdminEmail = cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com';
    const newMember: HouseMember = {
      id: `m_${Date.now()}`,
      houseId,
      userId,
      role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'MEMBER',
      joinedAt: new Date().toISOString(),
    };
    this.members.push(newMember);

    this.logActivity(houseId, userId, `Mendaftar dan bergabung ke kontrakan`, 'MEMBER', newMember.id);
    return { user: newUser, member: newMember };
  }
}

export const store = new MemoryStore();
