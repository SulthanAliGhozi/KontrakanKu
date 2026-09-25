import React, { useEffect, useState } from 'react';
import {
  Activity as ActivityIcon,
  Calendar,
  Copy,
  Check,
  Share2,
  TrendingDown,
  ShoppingBag,
  Clock,
  Filter,
} from 'lucide-react';
import { Activity, User } from '../../types';
import { api } from '../../services/apiClient';
import { Badge } from '../ui/Badge';

interface ActivityHubProps {
  houseId: string;
  activities: Activity[];
  users: User[];
}

export const ActivityHub: React.FC<ActivityHubProps> = ({ houseId, activities, users }) => {
  const [recapPeriod, setRecapPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [recapData, setRecapData] = useState<any>(null);
  const [isLoadingRecap, setIsLoadingRecap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  useEffect(() => {
    loadRecap(recapPeriod);
  }, [houseId, recapPeriod]);

  const loadRecap = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      setIsLoadingRecap(true);
      const res = await api.getRecap(houseId, period);
      setRecapData(res);
    } catch (err) {
      console.error('Error fetching recap:', err);
    } finally {
      setIsLoadingRecap(false);
    }
  };

  const handleCopyRecapText = () => {
    if (!recapData) return;
    const periodLabel =
      recapPeriod === 'daily' ? 'Harian' : recapPeriod === 'weekly' ? 'Mingguan' : 'Bulanan';
    const text = `📋 *REKAP KONTRAKAN ${periodLabel.toUpperCase()}*
🗓️ Tanggal: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}

🛒 *Belanja Kebutuhan Bersama*: Rp ${recapData.totalNeedSpending?.toLocaleString('id-ID')} (${
      recapData.totalPurchasesCount
    } pembelian)
💰 *Pengeluaran Kas Rumah*: Rp ${recapData.totalWalletExpense?.toLocaleString('id-ID')}
📥 *Pemasukan / Iuran Masuk*: Rp ${recapData.totalWalletIncome?.toLocaleString('id-ID')}
⚡ *Total Pengeluaran Rumah*: Rp ${recapData.totalHouseSpending?.toLocaleString('id-ID')}

👥 *Penghuni Aktif Berpartisipasi*: ${recapData.activeMembersCount} orang

_Dibuat otomatis oleh Kontrakanku House OS_ 🏡✨`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredActivities = activities.filter((a) => {
    if (selectedFilter === 'ALL') return true;
    return a.entityType === selectedFilter;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <ActivityIcon className="w-3.5 h-3.5" />
            <span>House Logs & Smart Recaps</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Aktivitas & Rekap</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Riwayat lengkap interaksi rumah dan laporan ringkas siap bagikan ke WhatsApp.
          </p>
        </div>

        <button
          onClick={handleCopyRecapText}
          disabled={!recapData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Teks Rekap Tersalin!' : 'Salin Rekap untuk WA'}</span>
        </button>
      </div>

      {/* Recap Generator Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Laporan Pengeluaran Rumah
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Konsolidasi pembelian kebutuhan & pengeluaran kas.
            </p>
          </div>

          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-xs">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRecapPeriod(p)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition ${
                  recapPeriod === p
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>

        {isLoadingRecap || !recapData ? (
          <div className="py-8 text-center text-xs text-zinc-500">Menyusun rekap...</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Belanja Kebutuhan
                </span>
                <span className="text-base font-bold text-white font-mono mt-1 block">
                  Rp {recapData.totalNeedSpending?.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {recapData.totalPurchasesCount} transaksi
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Pengeluaran Kas
                </span>
                <span className="text-base font-bold text-rose-400 font-mono mt-1 block">
                  Rp {recapData.totalWalletExpense?.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Termasuk reimburse</span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Pemasukan / Iuran
                </span>
                <span className="text-base font-bold text-emerald-400 font-mono mt-1 block">
                  Rp {recapData.totalWalletIncome?.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Masuk ke kas</span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Total Biaya Bersama
                </span>
                <span className="text-base font-bold text-sky-400 font-mono mt-1 block">
                  Rp {recapData.totalHouseSpending?.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {recapData.activeMembersCount} orang aktif
                </span>
              </div>
            </div>

            {/* Category breakdown */}
            {recapData.categoryDistribution?.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-zinc-300 block mb-2">
                  Distribusi Pembelian per Kategori
                </span>
                <div className="flex flex-wrap gap-2">
                  {recapData.categoryDistribution.map((cat: any) => (
                    <div
                      key={cat.name}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs flex items-center gap-2"
                    >
                      <span className="text-zinc-300 font-medium">{cat.name}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        Rp {cat.amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Aktivitas Rumah Terkini ({filteredActivities.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'NEED_PURCHASE', label: 'Belanja' },
              { id: 'DUTY', label: 'Giliran' },
              { id: 'SETTLEMENT', label: 'Pelunasan' },
              { id: 'WALLET', label: 'Kas' },
              { id: 'MAINTENANCE', label: 'Perbaikan' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedFilter === f.id
                    ? 'bg-zinc-700 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {filteredActivities.length === 0 ? (
            <p className="py-6 text-xs text-zinc-500 text-center">Belum ada log aktivitas.</p>
          ) : (
            filteredActivities.map((act) => {
              const user = users.find((u) => u.id === act.actorId);
              return (
                <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <img
                      src={user?.avatarUrl}
                      alt={user?.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{user?.name}</span>
                        <Badge variant="default" size="sm">
                          {act.entityType}
                        </Badge>
                      </div>
                      <p className="text-zinc-300 mt-0.5">{act.action}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    •{' '}
                    {new Date(act.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
