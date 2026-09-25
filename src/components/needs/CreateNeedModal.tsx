import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { NeedCluster } from '../../types';
import { ShieldCheck, ShieldAlert, Sparkles, Lock } from 'lucide-react';

interface CreateNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusters: NeedCluster[];
  isAdmin?: boolean;
  onSubmit: (data: {
    name: string;
    category: string;
    icon: string;
    color: string;
    type: string;
    dutyEnabled: boolean;
    clusterId?: string;
  }) => Promise<void>;
}

export const CreateNeedModal: React.FC<CreateNeedModalProps> = ({
  isOpen,
  onClose,
  clusters,
  isAdmin = true,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('GROCERIES');
  const [icon, setIcon] = useState('package');
  const [color, setColor] = useState('#10b981');
  const [type, setType] = useState('CONSUMABLE');
  const [dutyEnabled, setDutyEnabled] = useState(true);
  const [clusterId, setClusterId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Hanya Admin kontrakan (Ilaa) yang memiliki akses untuk mengisi atau menambahkan barang kebutuhan.');
      return;
    }
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSubmit({
        name,
        category,
        icon,
        color,
        type,
        dutyEnabled,
        clusterId: clusterId || undefined,
      });
      setName('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat kebutuhan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Kebutuhan Bersama"
      subtitle="Barang dan isi kebutuhan rumah tangga diatur & diisi oleh Admin kontrakan."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-zinc-100">
        {/* Admin status badge & warning */}
        {isAdmin ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Akses Terverifikasi:</strong> Anda login sebagai Admin kontrakan dan berhak mengisi daftar barang kebutuhan.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-300">Akses Dibatasi: Khusus Admin</p>
              <p className="text-[11px] text-zinc-300">
                Sesuai kebijakan rumah, daftar barang atau isi kebutuhan rumah diisi oleh <strong>Admin (Ilaa)</strong>.
                Anggota penghuni dapat mencatat pembelian saat tiba giliran belanja.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-900/40 border border-red-500/50 text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block font-semibold text-zinc-300 mb-1">Nama Barang / Kebutuhan</label>
          <input
            type="text"
            placeholder="Contoh: Sabun Cuci Piring / Minyak Goreng"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="GROCERIES" className="bg-zinc-900 text-white">Bahan Pokok & Pangan</option>
              <option value="UTILITIES" className="bg-zinc-900 text-white">Utilitas & Listrik</option>
              <option value="HOUSEHOLD" className="bg-zinc-900 text-white">Kebersihan & Rumah</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Tipe</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="CONSUMABLE" className="bg-zinc-900 text-white">Habis Pakai (Rutin)</option>
              <option value="DURABLE" className="bg-zinc-900 text-white">Barang Awet</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Warna Aksen</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={!isAdmin}
                className="h-8 w-12 rounded cursor-pointer border border-zinc-700 bg-transparent disabled:opacity-50"
              />
              <span className="font-mono text-zinc-400">{color}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Kluster Lokasi</label>
            <select
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="" className="bg-zinc-900 text-white">Seluruh Rumah</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={dutyEnabled}
              onChange={(e) => setDutyEnabled(e.target.checked)}
              disabled={!isAdmin}
              className="rounded border-zinc-700 text-emerald-500 focus:ring-0 disabled:opacity-50"
            />
            <span className="font-semibold">Aktifkan Rotasi Giliran Otomatis (Duty Engine)</span>
          </label>
          <p className="text-[11px] text-zinc-500 mt-1 pl-5">
            Sistem akan secara adil menggilirkan tugas pembelian kepada penghuni yang paling jarang membeli.
          </p>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isAdmin}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 font-bold text-black hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!isAdmin && <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Menyimpan...' : isAdmin ? 'Simpan Kebutuhan' : 'Khusus Admin'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
