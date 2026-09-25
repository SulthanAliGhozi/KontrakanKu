import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MaintenanceTicket, User } from '../../types';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface MaintenanceHubProps {
  tickets: MaintenanceTicket[];
  users: User[];
  currentUserId: string;
  onCreateTicket: (data: {
    title: string;
    description: string;
    estimatedCost: number;
    assignedMemberId?: string;
  }) => Promise<void>;
  onUpdateStatus: (ticketId: string, status: string) => Promise<void>;
  onReimburse: (ticketId: string, actualCost: number) => Promise<void>;
  onRefresh: () => void;
}

export const MaintenanceHub: React.FC<MaintenanceHubProps> = ({
  tickets,
  users,
  currentUserId,
  onCreateTicket,
  onUpdateStatus,
  onReimburse,
  onRefresh,
}) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>(50000);
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [actualCost, setActualCost] = useState<number | ''>(50000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreateTicket({
        title,
        description,
        estimatedCost: typeof estimatedCost === 'number' ? estimatedCost : 0,
        assignedMemberId: assignedMemberId || undefined,
      });
      setIsReportModalOpen(false);
      setTitle('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal melaporkan kerusakan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReimburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    const cost = typeof actualCost === 'number' ? actualCost : 0;
    if (cost <= 0) return;

    try {
      setIsSubmitting(true);
      await onReimburse(selectedTicket.id, cost);
      setIsReimburseModalOpen(false);
      setSelectedTicket(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal mereimburse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Wrench className="w-3.5 h-3.5" />
            <span>Facility Maintenance & Reimbursement</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Pemeliharaan Rumah</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Lapor kerusakan fasilitas, delegasikan perbaikan, dan reimburse biaya dari kas rumah.
          </p>
        </div>

        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Lapor Kerusakan</span>
        </button>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-zinc-500">
            Tidak ada tiket kerusakan aktif. Semua fasilitas rumah aman!
          </div>
        ) : (
          tickets.map((t) => {
            const reporter = users.find((u) => u.id === t.reporterId);
            const assigned = users.find((u) => u.id === t.assignedMemberId);

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">{t.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{t.description}</p>
                    </div>
                    <Badge
                      variant={
                        t.status === 'OPEN'
                          ? 'warning'
                          : t.status === 'IN_PROGRESS'
                          ? 'info'
                          : 'success'
                      }
                      size="sm"
                    >
                      {t.status === 'OPEN'
                        ? 'Menunggu'
                        : t.status === 'IN_PROGRESS'
                        ? 'Dikerjakan'
                        : 'Selesai'}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Pelapor & Teknisi
                      </span>
                      <span className="font-semibold text-zinc-200 mt-0.5 block truncate">
                        {reporter?.name?.split(' ')[0]} → {assigned?.name?.split(' ')[0] || 'Umum'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Estimasi Biaya
                      </span>
                      <span className="font-mono font-bold text-white mt-0.5 block">
                        Rp {t.estimatedCost.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {t.reimbursementStatus === 'REIMBURSED' ? (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Telah Direimburse Kas
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Belum reimburse kas</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {t.status === 'OPEN' && (
                      <button
                        onClick={() => onUpdateStatus(t.id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                      >
                        Mulai Kerjakan
                      </button>
                    )}

                    {t.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => onUpdateStatus(t.id, 'RESOLVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold"
                      >
                        Tandai Selesai
                      </button>
                    )}

                    {t.status === 'RESOLVED' && t.reimbursementStatus !== 'REIMBURSED' && (
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setActualCost(t.estimatedCost || 50000);
                          setIsReimburseModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-sm"
                      >
                        Reimburse dari Kas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Laporkan Kerusakan Fasilitas"
        subtitle="Laporkan lampu putus, kran bocor, atau perbaikan rumah lainnya."
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Nama Fasilitas / Masalah</label>
            <input
              type="text"
              placeholder="Contoh: Kran Kamar Mandi Bawah Bocor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Deskripsi Kerusakan</label>
            <textarea
              rows={3}
              placeholder="Jelaskan kondisi kerusakan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Estimasi Biaya (Rp)</label>
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) =>
                  setEstimatedCost(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Ditugaskan ke</label>
              <select
                value={assignedMemberId}
                onChange={(e) => setAssignedMemberId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
              >
                <option value="" className="bg-zinc-900 text-white">Semua Penghuni</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black"
            >
              {isSubmitting ? 'Menyimpan...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reimburse Modal */}
      <Modal
        isOpen={isReimburseModalOpen}
        onClose={() => setIsReimburseModalOpen(false)}
        title="Reimburse Biaya dari Kas Rumah"
        subtitle={`Keluarkan uang dari kas rumah untuk mengganti biaya perbaikan "${selectedTicket?.title}".`}
        maxWidth="md"
      >
        <form onSubmit={handleReimburseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Nominal Riil yang Dikeluarkan (Rp)
            </label>
            <input
              type="number"
              value={actualCost}
              onChange={(e) =>
                setActualCost(e.target.value ? parseInt(e.target.value, 10) : '')
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono text-sm"
              required
              min={100}
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Saldo kas rumah akan otomatis terpotong sejumlah nominal ini.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReimburseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black"
            >
              {isSubmitting ? 'Memproses...' : 'Konfirmasi Reimburse Kas'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
