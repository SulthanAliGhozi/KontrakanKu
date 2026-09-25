import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Need, User } from '../../types';

interface RecordPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  needs: Need[];
  users: User[];
  currentUserId: string;
  initialNeedId?: string;
  onSubmit: (data: {
    needId: string;
    purchaserId: string;
    amount: number;
    quantity: number;
    unit: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
}

export const RecordPurchaseModal: React.FC<RecordPurchaseModalProps> = ({
  isOpen,
  onClose,
  needs,
  users,
  currentUserId,
  initialNeedId,
  onSubmit,
}) => {
  const [needId, setNeedId] = useState(initialNeedId || (needs[0]?.id ?? ''));
  const [purchaserId, setPurchaserId] = useState(currentUserId);
  const [amount, setAmount] = useState<number | ''>(18000);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('pcs');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync need unit or standard default
  const handleNeedChange = (id: string) => {
    setNeedId(id);
    const selected = needs.find((n) => n.id === id);
    if (selected) {
      if (selected.lastAmount > 0) setAmount(selected.lastAmount);
      if (selected.name.toLowerCase().includes('galon')) setUnit('galon');
      else if (selected.name.toLowerCase().includes('gas')) setUnit('tabung');
      else if (selected.name.toLowerCase().includes('beras')) setUnit('sak 5kg');
      else if (selected.name.toLowerCase().includes('listrik')) setUnit('token');
      else setUnit('pcs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needId) {
      setError('Pilih kebutuhan yang dibeli.');
      return;
    }
    const numAmount = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
    if (!numAmount || numAmount <= 0) {
      setError('Masukkan nominal pembelian yang valid (Rupiah).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        needId,
        purchaserId,
        amount: Math.round(numAmount),
        quantity: quantity || 1,
        unit: unit || 'pcs',
        date,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pembelian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Pembelian Kebutuhan"
      subtitle="Otomatis memperbarui stok, kalender, aktivitas, dan merotasi giliran berikutnya."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Need Selection */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Barang / Kebutuhan</label>
          <select
            value={needId}
            onChange={(e) => handleNeedChange(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            required
          >
            {needs.map((n) => (
              <option key={n.id} value={n.id} className="bg-zinc-900 text-white">
                {n.name} (Terakhir: Rp {n.lastAmount.toLocaleString('id-ID')})
              </option>
            ))}
          </select>
        </div>

        {/* Purchaser Selection */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Dibeli Oleh (Penghuni)</label>
          <select
            value={purchaserId}
            onChange={(e) => setPurchaserId(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            required
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                {u.name} {u.id === currentUserId ? '(Kamu)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Total Biaya (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              placeholder="Contoh: 18000"
              required
              min={100}
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Tanggal Beli</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Jumlah (Qty)</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              min={1}
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Satuan</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="pcs / galon / sak"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Catatan Tambahan (Opsional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Contoh: Beli di Depot Sejahtera, merk Aqua asli"
          />
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black transition disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pembelian'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
