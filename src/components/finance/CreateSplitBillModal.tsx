import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { User } from '../../types';
import { calculateSplitBill } from '../../domain/splitBillValidator';

interface CreateSplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;
  onSubmit: (data: {
    title: string;
    totalAmount: number;
    payerId: string;
    splitType: 'EQUAL_SPLIT' | 'SELECTED_SPLIT' | 'EXACT_SPLIT';
    selectedMemberIds: string[];
    exactAmounts?: Record<string, number>;
    notes?: string;
  }) => Promise<void>;
}

export const CreateSplitBillModal: React.FC<CreateSplitBillModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>(200000);
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitType, setSplitType] = useState<'EQUAL_SPLIT' | 'SELECTED_SPLIT' | 'EXACT_SPLIT'>(
    'EQUAL_SPLIT'
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(users.map((u) => u.id));
  const [exactAmounts, setExactAmounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleExactAmountChange = (userId: string, val: number) => {
    setExactAmounts({
      ...exactAmounts,
      [userId]: val,
    });
  };

  // Run live calculation
  const numTotal = typeof totalAmount === 'number' ? totalAmount : 0;
  const validation = calculateSplitBill({
    totalAmount: numTotal,
    splitType,
    payerId,
    selectedMemberIds: splitType === 'EQUAL_SPLIT' ? users.map((u) => u.id) : selectedMemberIds,
    exactAmounts,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Masukkan judul pengeluaran');
      return;
    }
    if (!numTotal || numTotal <= 0) {
      setError('Masukkan total nominal yang valid');
      return;
    }

    if (!validation.isValid) {
      setError(validation.error || 'Perhitungan pembagian tidak valid');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        title,
        totalAmount: numTotal,
        payerId,
        splitType,
        selectedMemberIds: splitType === 'EQUAL_SPLIT' ? users.map((u) => u.id) : selectedMemberIds,
        exactAmounts: splitType === 'EXACT_SPLIT' ? exactAmounts : undefined,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat split bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Split Bill Baru"
      subtitle="Bagi biaya bersama secara adil dengan validasi nominal integer."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Nama / Keperluan Tagihan</label>
          <input
            type="text"
            placeholder="Contoh: Beli Token Listrik 200rb"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            required
          />
        </div>

        {/* Amount & Payer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Total Biaya (Rp)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              placeholder="Contoh: 200000"
              required
              min={100}
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Ditalangi Oleh</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                  {u.name} {u.id === currentUserId ? '(Kamu)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Type Tabs */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1.5">Metode Pembagian</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'EQUAL_SPLIT', label: 'Bagi Rata Semua' },
              { id: 'SELECTED_SPLIT', label: 'Pilih Penghuni' },
              { id: 'EXACT_SPLIT', label: 'Nominal Kustom' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setSplitType(tab.id as any)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition text-center ${
                  splitType === tab.id
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member Selector & Custom share preview */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
            Penghuni yang Terlibat & Rincian
          </span>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {users.map((u) => {
              const isSelected =
                splitType === 'EQUAL_SPLIT' ? true : selectedMemberIds.includes(u.id);
              const calculatedShare =
                validation.participants.find((p) => p.memberId === u.id)?.amount || 0;

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition ${
                    isSelected
                      ? 'border-zinc-700 bg-zinc-900/70'
                      : 'border-zinc-800 bg-zinc-900/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {splitType !== 'EQUAL_SPLIT' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(u.id)}
                        className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                      />
                    )}
                    <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full" />
                    <span className="font-semibold text-zinc-200">
                      {u.name} {u.id === payerId ? '(Pembayar)' : ''}
                    </span>
                  </div>

                  {splitType === 'EXACT_SPLIT' && isSelected ? (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Rp</span>
                      <input
                        type="number"
                        value={exactAmounts[u.id] ?? ''}
                        onChange={(e) =>
                          handleExactAmountChange(u.id, parseInt(e.target.value, 10) || 0)
                        }
                        placeholder="0"
                        className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-xs text-white font-mono"
                      />
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-zinc-300">
                      {isSelected ? `Rp ${calculatedShare.toLocaleString('id-ID')}` : '-'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation Math Check */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Total teralokasi:</span>
            {(() => {
              const allocated = validation.participants.reduce((sum, p) => sum + p.amount, 0);
              return (
                <span
                  className={`font-mono font-bold ${
                    validation.isValid ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Rp {allocated.toLocaleString('id-ID')} / Rp{' '}
                  {numTotal.toLocaleString('id-ID')}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Catatan Tambahan</label>
          <input
            type="text"
            placeholder="Opsional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
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
            disabled={isSubmitting || !validation.isValid}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black transition disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Split Bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
