import React, { useState } from 'react';
import {
  X,
  Settings,
  Archive,
  RefreshCw,
  Save,
  Tag,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Need, NeedCategory, NeedCluster } from '../../types';
import { api } from '../../services/apiClient';

interface ConfigureNeedModalProps {
  need: Need;
  clusters: NeedCluster[];
  onClose: () => void;
  onSaved: () => void;
}

export const ConfigureNeedModal: React.FC<ConfigureNeedModalProps> = ({
  need,
  clusters,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(need.name);
  const [icon, setIcon] = useState(need.icon || 'package');
  const [category, setCategory] = useState<NeedCategory>(need.category);
  const [color, setColor] = useState(need.color || '#10b981');
  const [type, setType] = useState(need.type || 'CONSUMABLE');
  const [dutyEnabled, setDutyEnabled] = useState(need.dutyEnabled);
  const [clusterId, setClusterId] = useState(need.clusterId || '');
  const [averageConsumptionDays, setAverageConsumptionDays] = useState(
    need.averageConsumptionDays || 7
  );
  const [expectedNextPurchaseDate, setExpectedNextPurchaseDate] = useState(
    need.expectedNextPurchaseDate || ''
  );
  const [unit, setUnit] = useState(need.unit || 'pcs');
  const [thresholdDays, setThresholdDays] = useState(need.thresholdDays || 2);
  const [notes, setNotes] = useState(need.notes || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.updateNeed(need.id, {
        name,
        icon,
        category,
        color,
        type,
        dutyEnabled,
        clusterId: clusterId || undefined,
        averageConsumptionDays: Number(averageConsumptionDays),
        expectedNextPurchaseDate: expectedNextPurchaseDate || undefined,
        unit,
        thresholdDays: Number(thresholdDays),
        notes,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    const isCurrentlyArchived = Boolean(need.archived);
    const confirmText = isCurrentlyArchived
      ? 'Aktifkan kembali kebutuhan ini ke daftar aktif?'
      : 'Arsipkan kebutuhan ini? Barang tidak akan muncul di daftar belanja utama.';
    if (!confirm(confirmText)) return;

    setIsLoading(true);
    try {
      await api.archiveNeed(need.id, !isCurrentlyArchived);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah arsip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
              style={{ backgroundColor: `${color}20`, color: color }}
            >
              {icon === 'droplet'
                ? '💧'
                : icon === 'flame'
                ? '🔥'
                : icon === 'wheat'
                ? '🌾'
                : icon === 'sparkles'
                ? '✨'
                : icon === 'wifi'
                ? '📶'
                : '📦'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Konfigurasi Kebutuhan</h2>
              <p className="text-xs text-zinc-400">Atur parameter giliran, konsumsi, dan arsip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Scrollable form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-zinc-300 mb-1">Nama Barang / Layanan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NeedCategory)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="GROCERIES" className="bg-zinc-900 text-white">Bahan Pokok (Groceries)</option>
                <option value="UTILITIES" className="bg-zinc-900 text-white">Utilitas & Listrik</option>
                <option value="HOUSEHOLD" className="bg-zinc-900 text-white">Kebutuhan Rumah Tangga</option>
                <option value="MAINTENANCE" className="bg-zinc-900 text-white">Perbaikan & Servis</option>
                <option value="OTHER" className="bg-zinc-900 text-white">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Tipe Barang</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="CONSUMABLE" className="bg-zinc-900 text-white">Habis Pakai (Consumable)</option>
                <option value="DURABLE" className="bg-zinc-900 text-white">Tahan Lama (Durable)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Contoh: galon, tabung, kg"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Pilihan Warna Aksen</label>
              <div className="flex items-center gap-2 pt-1">
                {['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      color === c ? 'border-white scale-110 shadow-xs' : 'border-transparent opacity-60'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Duty & Cluster Settings */}
          <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Sistem Giliran Otomatis</span>
                <span className="text-[11px] text-zinc-400 block">
                  Aktifkan perputaran tanggung jawab pembelian antar penghuni
                </span>
              </div>
              <input
                type="checkbox"
                checked={dutyEnabled}
                onChange={(e) => setDutyEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-0"
              />
            </div>

            {clusters.length > 0 && (
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Kluster Penghuni Bertanggung Jawab</label>
                <select
                  value={clusterId}
                  onChange={(e) => setClusterId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="" className="bg-zinc-900 text-white">Semua Anggota Rumah (Default)</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                      {c.name} ({c.memberIds.length} orang)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Consumption & Prediction Engine */}
          <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-3">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Parameter Konsumsi & Estimasi Habis</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Rata-rata Siklus (Hari)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={averageConsumptionDays}
                  onChange={(e) => setAverageConsumptionDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Interval rata-rata habis pakai
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Peringatan Menipis (H-)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Hari sebelum habis diberi notifikasi
                </span>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-zinc-300 mb-1">
                  Estimasi Jadwal Pembelian Selanjutnya
                </label>
                <input
                  type="date"
                  value={expectedNextPurchaseDate}
                  onChange={(e) => setExpectedNextPurchaseDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Beli merek Aqua di depot Pak Joko depan gang..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleToggleArchive}
              disabled={isLoading}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                need.archived
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/30'
                  : 'border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{need.archived ? 'Pulihkan dari Arsip' : 'Arsipkan Kebutuhan'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
