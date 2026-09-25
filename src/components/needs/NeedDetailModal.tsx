import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { api } from '../../services/apiClient';
import { Need, NeedPurchase, DutyLedgerEntry, User } from '../../types';
import {
  Calendar,
  Clock,
  User as UserIcon,
  TrendingUp,
  History,
  RotateCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

interface NeedDetailModalProps {
  needId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordPurchase: (need: Need) => void;
  onOpenConfigure?: (need: Need) => void;
  users: User[];
  currentUserId: string;
  onRefresh: () => void;
}

export const NeedDetailModal: React.FC<NeedDetailModalProps> = ({
  needId,
  isOpen,
  onClose,
  onOpenRecordPurchase,
  onOpenConfigure,
  users,
  currentUserId,
  onRefresh,
}) => {
  const [data, setData] = useState<{
    need: Need;
    purchases: NeedPurchase[];
    metrics: any;
    dutyLedger: DutyLedgerEntry[];
    currentDutyUser?: User;
    lastPurchaserUser?: User;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const loadDetail = async () => {
    if (!needId) return;
    try {
      setIsLoading(true);
      const res = await api.getNeedDetail(needId);
      setData(res);
      if (users.length > 0) {
        setTransferTargetId(users[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && needId) {
      loadDetail();
    }
  }, [isOpen, needId]);

  if (!needId || !isOpen) return null;

  const handleDutyAction = async (action: 'TRANSFER' | 'SKIP', targetId?: string) => {
    if (!data) return;
    try {
      await api.performDutyAction({
        needId: data.need.id,
        houseId: data.need.houseId,
        memberId: currentUserId,
        action,
        transferToMemberId: targetId,
        note: transferNote || (action === 'SKIP' ? 'Dilewati' : 'Dialihkan giliran'),
      });
      setShowTransferForm(false);
      setTransferNote('');
      await loadDetail();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah giliran');
    }
  };

  const need = data?.need;
  const metrics = data?.metrics;
  const purchases = data?.purchases || [];
  const dutyLedger = data?.dutyLedger || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={need?.name || 'Detail Kebutuhan'}
      subtitle={`Kategori: ${need?.category || 'Umum'} • Tipe: ${need?.type || 'Habis Pakai'}`}
      maxWidth="lg"
    >
      {isLoading || !need ? (
        <div className="py-12 text-center text-xs text-zinc-500">Memuat data kebutuhan...</div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* Top Status Banner */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    need.status === 'AVAILABLE'
                      ? 'success'
                      : need.status === 'RUNNING_LOW'
                      ? 'warning'
                      : 'danger'
                  }
                  size="md"
                >
                  {need.status === 'AVAILABLE'
                    ? 'Stok Tersedia'
                    : need.status === 'RUNNING_LOW'
                    ? 'Stok Menipis'
                    : 'Stok Habis'}
                </Badge>
                <span className="text-zinc-400">
                  Terakhir dibeli: {need.lastPurchasedAt ? new Date(need.lastPurchasedAt).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenConfigure && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenConfigure(need);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition"
                  >
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Konfigurasi</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    onOpenRecordPurchase(need);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Catat Pembelian</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Intelligence Matrix (Record -> Understand -> Assign -> Balance -> Predict) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Terakhir Dibeli
              </span>
              <span className="text-sm font-bold text-white block truncate">
                {data.lastPurchaserUser?.name?.split(' ')[0] || '-'}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
                {need.lastAmount > 0 ? `Rp ${need.lastAmount.toLocaleString('id-ID')}` : '-'}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Rata-Rata Interval
              </span>
              <span className="text-sm font-bold text-white block">
                {need.averageConsumptionDays > 0 ? `${need.averageConsumptionDays} hari` : 'Belum cukup'}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                {purchases.length} pembelian
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Estimasi Beli Lagi
              </span>
              <span className="text-sm font-bold text-emerald-400 block font-mono">
                {need.expectedNextPurchaseDate
                  ? new Date(need.expectedNextPurchaseDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Menghitung...'}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">Prediksi pola</span>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Giliran Saat Ini
              </span>
              <span className="text-sm font-bold text-amber-400 block truncate">
                {data.currentDutyUser?.name?.split(' ')[0] || 'Otomatis'}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">Berdasarkan rotasi</span>
            </div>
          </div>

          {/* Duty Management Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Manajemen Giliran (Duty Engine)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTransferForm(!showTransferForm)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                >
                  {showTransferForm ? 'Batal' : 'Alihkan Giliran'}
                </button>
                <button
                  onClick={() => handleDutyAction('SKIP')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                >
                  Lewati
                </button>
              </div>
            </div>

            {showTransferForm && (
              <div className="mb-4 p-3 rounded-xl border border-zinc-700 bg-zinc-900 space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-white block">
                  Alihkan Giliran ke Teman Rumah
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Alasan pengalihan (opsional)"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDutyAction('TRANSFER', transferTargetId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-black text-xs transition"
                  >
                    Konfirmasi Pengalihan
                  </button>
                </div>
              </div>
            )}

            {/* Duty History list */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {dutyLedger.slice(0, 5).map((entry) => {
                const user = users.find((u) => u.id === entry.memberId);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-900/40 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          entry.action === 'EXECUTE'
                            ? 'text-emerald-400'
                            : entry.action === 'ASSIGN'
                            ? 'text-sky-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {entry.action}
                      </span>
                      <span className="text-zinc-300 font-semibold">{user?.name}</span>
                      {entry.note && <span className="text-zinc-500 truncate">— {entry.note}</span>}
                    </div>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {new Date(entry.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consumption Trend & Prediction Metrics */}
          {metrics && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Analisis Konsumsi & Pola Rumah
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Interval Terpendek</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5 block">
                    {metrics.shortestIntervalDays ? `${metrics.shortestIntervalDays} hari` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Interval Terpanjang</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5 block">
                    {metrics.longestIntervalDays ? `${metrics.longestIntervalDays} hari` : '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Tren Pemakaian</span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                    {metrics.consumptionTrend === 'STABLE'
                      ? 'Konsisten / Stabil'
                      : metrics.consumptionTrend === 'ACCELERATING'
                      ? 'Makin Cepat Habis'
                      : 'Makin Lambat'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Purchases History */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Riwayat Pembelian ({purchases.length})
                </h4>
              </div>
            </div>

            <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto pr-1">
              {purchases.length === 0 ? (
                <p className="text-zinc-500 py-4 text-center">Belum ada riwayat pembelian.</p>
              ) : (
                purchases.map((p) => {
                  const purchaser = users.find((u) => u.id === p.purchaserId);
                  return (
                    <div key={p.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">{purchaser?.name}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400">
                            {p.quantity} {p.unit}
                          </span>
                        </div>
                        {p.notes && <p className="text-zinc-500 text-[11px] mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 block">
                          Rp {p.amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-zinc-500 block font-mono">
                          {new Date(p.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
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
    </Modal>
  );
};
