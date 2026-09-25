import React, { useState } from 'react';
import {
  Wallet,
  ArrowRight,
  QrCode,
  CheckCircle2,
  PlusCircle,
  Receipt,
  PiggyBank,
  Check,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import {
  HouseWallet,
  WalletTransaction,
  MonthlyContribution,
  SplitBill,
  Settlement,
  NetBalancePosition,
  SettlementPlanItem,
  User,
} from '../../types';
import { GenerateQRISModal } from './GenerateQRISModal';
import { GenerateQRIS } from './GenerateQRIS';
import { CreateSplitBillModal } from './CreateSplitBillModal';
import { Modal } from '../ui/Modal';

interface FinanceHubProps {
  wallet: HouseWallet;
  transactions: WalletTransaction[];
  contributions: MonthlyContribution[];
  splitBills: SplitBill[];
  settlements: Settlement[];
  netBalances: NetBalancePosition[];
  settlementPlan: SettlementPlanItem[];
  users: User[];
  currentUserId: string;
  onPaySettlement: (settlement: {
    creditorId: string;
    amount: number;
    proofUrl?: string;
    notes?: string;
  }) => Promise<void>;
  onConfirmSettlement: (settlementId: string) => Promise<void>;
  onCreateSplitBill: (data: any) => Promise<void>;
  onPayContribution: (contributionId: string, amount: number) => Promise<void>;
  onCreateWalletTx: (data: any) => Promise<void>;
  onRefresh: () => void;
}

export const FinanceHub: React.FC<FinanceHubProps> = ({
  wallet,
  transactions,
  contributions,
  splitBills,
  settlements,
  netBalances,
  settlementPlan,
  users,
  currentUserId,
  onPaySettlement,
  onConfirmSettlement,
  onCreateSplitBill,
  onPayContribution,
  onCreateWalletTx,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    'SETTLE_UP' | 'WALLET' | 'SPLIT_BILLS' | 'CONTRIBUTIONS' | 'QRIS'
  >('SETTLE_UP');

  // QRIS Modal State
  const [qrisModalOpen, setQrisModalOpen] = useState(false);
  const [qrisReceiver, setQrisReceiver] = useState<{ id: string; name: string; amount: number }>({
    id: '',
    name: '',
    amount: 0,
  });

  // Split Bill Modal State
  const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);

  // Add Wallet Tx Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletTxType, setWalletTxType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [walletTxAmount, setWalletTxAmount] = useState<number | ''>(50000);
  const [walletTxDesc, setWalletTxDesc] = useState('');
  const [walletTxCat, setWalletTxCat] = useState('MAINTENANCE');

  // Settle Up Actions
  const handleOpenQRIS = (creditorId: string, amount: number) => {
    const user = users.find((u) => u.id === creditorId);
    setQrisReceiver({
      id: creditorId,
      name: user?.name || 'Penerima',
      amount,
    });
    setQrisModalOpen(true);
  };

  const handleQRISPaymentMarked = async (amount: number, proofNotes?: string) => {
    await onPaySettlement({
      creditorId: qrisReceiver.id,
      amount,
      notes: proofNotes || 'Dibayar via QRIS Dinamis',
    });
    onRefresh();
  };

  const handleSaveWalletTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = typeof walletTxAmount === 'number' ? walletTxAmount : 0;
    if (!num || num <= 0 || !walletTxDesc.trim()) return;

    await onCreateWalletTx({
      walletId: wallet.id,
      houseId: wallet.houseId,
      actorId: currentUserId,
      type: walletTxType,
      amount: num,
      description: walletTxDesc,
      category: walletTxCat,
    });
    setIsWalletModalOpen(false);
    setWalletTxDesc('');
    onRefresh();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Balance Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>House Financial Ledger & Settlement</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Keuangan Rumah</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Transparansi kas bersama, pelunasan utang teroptimasi, dan QRIS dinamis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setQrisReceiver({ id: 'kas_rumah', name: 'KAS MARKAS WARUNG', amount: 100000 });
              setQrisModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold transition shadow-sm"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Generate QRIS</span>
          </button>
          <button
            onClick={() => setIsSplitBillModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Buat Split Bill</span>
          </button>
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Catat Kas</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 overflow-x-auto">
        {[
          { id: 'SETTLE_UP', label: 'Pelunasan & Settle Up', icon: ArrowRight },
          { id: 'WALLET', label: 'Kas Rumah', icon: PiggyBank },
          { id: 'SPLIT_BILLS', label: 'Daftar Split Bill', icon: Receipt },
          { id: 'CONTRIBUTIONS', label: 'Iuran Bulanan', icon: Wallet },
          { id: 'QRIS', label: 'Generate QRIS', icon: QrCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SETTLE UP (Net Balances & Optimized Plan) */}
      {activeTab === 'SETTLE_UP' && (
        <div className="space-y-6">
          {/* Greedy Settlement Plan Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rencana Pelunasan Teroptimasi (Minimal Transaksi)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Algoritma pelunasan otomatis menghitung siapa harus bayar ke siapa agar jumlah transfer seminimal mungkin.
                </p>
              </div>
            </div>

            {settlementPlan.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Semua posisi hutang piutang telah impas. Tidak ada pembayaran yang diperlukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {settlementPlan.map((plan, idx) => {
                  const fromUser = users.find((u) => u.id === plan.debtorId);
                  const toUser = users.find((u) => u.id === plan.creditorId);
                  const isIWhoOwe = plan.debtorId === currentUserId;
                  const isIWhoReceive = plan.creditorId === currentUserId;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex flex-col justify-between ${
                        isIWhoOwe
                          ? 'border-rose-500/30 bg-rose-950/10'
                          : isIWhoReceive
                          ? 'border-emerald-500/30 bg-emerald-950/10'
                          : 'border-zinc-800 bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={fromUser?.avatarUrl}
                            alt={fromUser?.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-white block">
                              {fromUser?.name?.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-zinc-400">Pembayar</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center px-2">
                          <span className="text-[10px] text-zinc-400 font-mono">transfer</span>
                          <ArrowRight className="w-4 h-4 text-emerald-400" />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <span className="font-bold text-white block">
                              {toUser?.name?.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-zinc-400">Penerima</span>
                          </div>
                          <img
                            src={toUser?.avatarUrl}
                            alt={toUser?.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Nominal Pelunasan</span>
                          <span className="text-sm font-bold text-white font-mono">
                            Rp {plan.amount.toLocaleString('id-ID')}
                          </span>
                        </div>

                        {isIWhoOwe ? (
                          <button
                            onClick={() => handleOpenQRIS(plan.creditorId, plan.amount)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Bayar via QRIS</span>
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {isIWhoReceive ? 'Menunggu pembayaran' : 'Penyelesaian antar penghuni'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Confirmations Queue */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Antrean Konfirmasi Pembayaran
              </h3>
              <span className="text-xs text-zinc-400">
                {settlements.filter((s) => s.status === 'PAYMENT_SUBMITTED').length} menunggu
              </span>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {settlements.length === 0 ? (
                <p className="py-4 text-xs text-zinc-500 text-center">Belum ada riwayat pelunasan.</p>
              ) : (
                settlements.map((s) => {
                  const debtor = users.find((u) => u.id === s.debtorId);
                  const creditor = users.find((u) => u.id === s.creditorId);
                  const isCreditor = s.creditorId === currentUserId;

                  return (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{debtor?.name}</span>
                          <span className="text-zinc-500">→</span>
                          <span className="font-bold text-white">{creditor?.name}</span>
                          <Badge
                            variant={s.status === 'CONFIRMED' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {s.status === 'CONFIRMED' ? 'Lunas / Impas' : 'Menunggu Konfirmasi'}
                          </Badge>
                        </div>
                        {s.notes && <p className="text-zinc-400 text-[11px] mt-0.5">{s.notes}</p>}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">
                          Rp {s.amount.toLocaleString('id-ID')}
                        </span>

                        {isCreditor && s.status === 'PAYMENT_SUBMITTED' && (
                          <button
                            onClick={() => onConfirmSettlement(s.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Konfirmasi Masuk</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Net Balances Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Posisi Saldo Bersih Seluruh Penghuni
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {netBalances.map((pos) => {
                const user = users.find((u) => u.id === pos.memberId);
                const isPositive = pos.netAmount > 0;
                const isNegative = pos.netAmount < 0;

                return (
                  <div
                    key={pos.memberId}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user?.avatarUrl}
                        alt={user?.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="font-bold text-white text-xs block">{user?.name}</span>
                        <span className="text-[10px] text-zinc-500">
                          {isPositive ? 'Berhak menerima' : isNegative ? 'Perlu membayar' : 'Impas'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold text-sm ${
                        isPositive
                          ? 'text-emerald-400'
                          : isNegative
                          ? 'text-rose-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {isPositive
                        ? `+Rp ${pos.netAmount.toLocaleString('id-ID')}`
                        : isNegative
                        ? `-Rp ${Math.abs(pos.netAmount).toLocaleString('id-ID')}`
                        : 'Rp 0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOUSE WALLET */}
      {activeTab === 'WALLET' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80">
              <span className="text-xs text-zinc-400 block">Saldo Kas Saat Ini</span>
              <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
                Rp {wallet.balance.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                Terkalkulasi aman dari buku kas
              </span>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80">
              <span className="text-xs text-zinc-400 block">Total Transaksi Kas</span>
              <span className="text-2xl font-extrabold text-zinc-200 font-mono mt-1 block">
                {transactions.length} mutasi
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Tercatat permanen</span>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80">
              <span className="text-xs text-zinc-400 block">Iuran Terkumpul Bulan Ini</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
                Rp{' '}
                {contributions
                  .reduce((acc, c) => acc + c.paidAmount, 0)
                  .toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Target: Rp 250.000</span>
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Buku Mutasi Kas Bersama
              </h3>
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                + Tambah Mutasi
              </button>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {transactions.length === 0 ? (
                <p className="py-6 text-xs text-zinc-500 text-center">Belum ada mutasi kas.</p>
              ) : (
                transactions.map((tx) => {
                  const actor = users.find((u) => u.id === tx.actorId);
                  const isIncome = tx.type === 'INCOME';

                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isIncome ? 'success' : tx.type === 'REIMBURSEMENT' ? 'info' : 'danger'}
                            size="sm"
                          >
                            {tx.type}
                          </Badge>
                          <span className="font-bold text-white">{tx.description}</span>
                        </div>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                          Oleh {actor?.name || 'Sistem'} • Kategori: {tx.category}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold block ${
                            isIncome ? 'text-emerald-400' : 'text-zinc-300'
                          }`}
                        >
                          {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPLIT BILLS */}
      {activeTab === 'SPLIT_BILLS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Daftar Tagihan Bersama (Split Bill)
            </h3>
            <button
              onClick={() => setIsSplitBillModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition"
            >
              + Buat Split Bill
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {splitBills.map((sb) => {
              const payer = users.find((u) => u.id === sb.payerId);
              const paidCount = sb.participants.filter((p) => p.isPaid).length;

              return (
                <div
                  key={sb.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{sb.title}</h4>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Ditalangi oleh: <strong className="text-zinc-200">{payer?.name}</strong>
                        </p>
                      </div>
                      <Badge variant={sb.status === 'SETTLED' ? 'success' : 'warning'} size="sm">
                        {sb.status === 'SETTLED' ? 'Selesai' : 'Aktif'}
                      </Badge>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex justify-between items-center">
                      <span className="text-zinc-400">Total Tagihan:</span>
                      <span className="font-mono font-bold text-white">
                        Rp {sb.totalAmount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Participants List */}
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Rincian Peserta ({paidCount}/{sb.participants.length} Lunas)
                      </span>
                      {sb.participants.map((p) => {
                        const user = users.find((u) => u.id === p.memberId);
                        return (
                          <div
                            key={p.memberId}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-300">{user?.name?.split(' ')[0]}</span>
                              {p.isPaid && (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Lunas
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-zinc-300">
                              Rp {p.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CONTRIBUTIONS */}
      {activeTab === 'CONTRIBUTIONS' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Iuran Kas Rutin Bulanan
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Setiap penghuni berkontribusi Rp 50.000 / bulan untuk kas darurat & pemeliharaan.
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {contributions.map((c) => {
              const member = users.find((u) => u.id === c.memberId);
              const isPaid = c.status === 'PAID';
              const isMyContribution = c.memberId === currentUserId;

              return (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={member?.avatarUrl}
                      alt={member?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-bold text-white block">
                        {member?.name} {isMyContribution ? '(Kamu)' : ''}
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        Periode {c.month} • Target: Rp {c.targetAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={isPaid ? 'success' : 'warning'} size="md">
                      {isPaid ? 'Lunas' : 'Belum Bayar'}
                    </Badge>

                    {!isPaid && (
                      <button
                        onClick={() => onPayContribution(c.id, c.targetAmount - c.paidAmount)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
                      >
                        Bayar Sekarang
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: GENERATE QRIS */}
      {activeTab === 'QRIS' && (
        <GenerateQRIS
          users={users}
          houseName="KONTRAKAN MARKAS WARUNG"
          houseAddress="GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Bojongsoang, Bandung"
          onPaymentSuccess={async (amt, notes) => {
            await onCreateWalletTx({
              houseId: 'house_harmoni',
              type: 'INCOME',
              amount: amt,
              actorId: currentUserId,
              category: 'CONTRIBUTION',
              description: notes || 'Pembayaran via QRIS Dinamis',
            });
            onRefresh();
          }}
        />
      )}

      {/* Split Bill Modal */}
      <CreateSplitBillModal
        isOpen={isSplitBillModalOpen}
        onClose={() => setIsSplitBillModalOpen(false)}
        users={users}
        currentUserId={currentUserId}
        onSubmit={async (data) => {
          await onCreateSplitBill(data);
          onRefresh();
        }}
      />

      {/* Dynamic QRIS Modal */}
      <GenerateQRISModal
        isOpen={qrisModalOpen}
        onClose={() => setQrisModalOpen(false)}
        receiverId={qrisReceiver.id}
        receiverName={qrisReceiver.name}
        amount={qrisReceiver.amount}
        users={users}
        houseName="KONTRAKAN MARKAS WARUNG"
        houseAddress="GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Bojongsoang, Bandung"
        onPaymentMarked={handleQRISPaymentMarked}
      />

      {/* Manual Wallet Transaction Modal */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title="Catat Mutasi Kas Rumah"
        subtitle="Tambah pengeluaran atau pemasukan langsung ke dompet kas bersama."
        maxWidth="md"
      >
        <form onSubmit={handleSaveWalletTx} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Jenis Transaksi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWalletTxType('EXPENSE')}
                className={`py-2 rounded-xl font-bold transition ${
                  walletTxType === 'EXPENSE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Pengeluaran (-)
              </button>
              <button
                type="button"
                onClick={() => setWalletTxType('INCOME')}
                className={`py-2 rounded-xl font-bold transition ${
                  walletTxType === 'INCOME'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Pemasukan (+)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Deskripsi Mutasi</label>
            <input
              type="text"
              placeholder="Contoh: Beli gembok pagar baru"
              value={walletTxDesc}
              onChange={(e) => setWalletTxDesc(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                value={walletTxAmount}
                onChange={(e) =>
                  setWalletTxAmount(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono"
                required
                min={100}
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Kategori</label>
              <select
                value={walletTxCat}
                onChange={(e) => setWalletTxCat(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
              >
                <option value="MAINTENANCE" className="bg-zinc-900 text-white">Pemeliharaan</option>
                <option value="HOUSEHOLD" className="bg-zinc-900 text-white">Kebutuhan Rumah</option>
                <option value="EMERGENCY" className="bg-zinc-900 text-white">Dana Darurat</option>
                <option value="OTHER" className="bg-zinc-900 text-white">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(false)}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 font-bold text-black hover:bg-emerald-400"
            >
              Simpan Mutasi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
