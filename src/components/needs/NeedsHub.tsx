import React, { useState } from 'react';
import {
  Package,
  Plus,
  Droplets,
  Flame,
  Wheat,
  Zap,
  ShoppingBag,
  Sparkles,
  Calendar,
  RotateCw,
  Search,
  Archive,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { Need, NeedCluster, User } from '../../types';
import { Badge } from '../ui/Badge';

interface NeedsHubProps {
  needs: Need[];
  clusters: NeedCluster[];
  users: User[];
  currentUserId: string;
  isAdmin?: boolean;
  onSelectNeed: (needId: string) => void;
  onOpenRecordPurchase: (need: Need) => void;
  onOpenCreateNeed: () => void;
  onOpenConfigureNeed?: (need: Need) => void;
}

export const NeedsHub: React.FC<NeedsHubProps> = ({
  needs,
  clusters,
  users,
  currentUserId,
  isAdmin = true,
  onSelectNeed,
  onOpenRecordPurchase,
  onOpenCreateNeed,
  onOpenConfigureNeed,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const getNeedIcon = (iconName: string) => {
    switch (iconName) {
      case 'droplets':
        return Droplets;
      case 'flame':
        return Flame;
      case 'wheat':
        return Wheat;
      case 'zap':
        return Zap;
      default:
        return Package;
    }
  };

  const categories = [
    { id: 'ALL', label: 'Semua Kebutuhan' },
    { id: 'GROCERIES', label: 'Bahan Pokok & Pangan' },
    { id: 'UTILITIES', label: 'Utilitas & Listrik' },
    { id: 'HOUSEHOLD', label: 'Kebersihan & Rumah' },
  ];

  const archivedCount = needs.filter((n) => Boolean(n.archived)).length;

  const filteredNeeds = needs.filter((n) => {
    const isArchived = Boolean(n.archived);
    if (showArchived && !isArchived) return false;
    if (!showArchived && isArchived) return false;

    const matchesCategory = selectedCategory === 'ALL' || n.category === selectedCategory;
    const matchesSearch =
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>Shared Needs & Rotation Hub</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Kebutuhan Bersama</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Kelola barang bersama, rotasi giliran belanja yang adil, dan pantau interval konsumsi rumah.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {needs.length > 0 && (
            <button
              onClick={() => onOpenRecordPurchase(needs[0])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catat Pembelian</span>
            </button>
          )}
          <button
            onClick={onOpenCreateNeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-bold transition cursor-pointer"
            title="Tambah barang kebutuhan baru"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Tambah Kebutuhan</span>
          </button>
        </div>
      </div>

      {/* Admin Notice */}
      <div className="p-3 rounded-2xl border bg-zinc-900/80 border-zinc-800 text-zinc-300 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">SISTEM KEBUTUHAN</span>
          <p>
            {isAdmin ? (
              <span>Anda mengelola daftar barang kebutuhan kontrakan sebagai <strong>Admin / Super Admin</strong>.</span>
            ) : (
              <span>Daftar barang & isi kebutuhan rumah tangga diisi & dipantau secara transparan untuk seluruh penghuni.</span>
            )}
          </p>
        </div>
        <span className="text-[11px] font-mono text-emerald-400/80 shrink-0 hidden sm:inline">
          {needs.length} Barang Terdaftar
        </span>
      </div>

      {/* Search, Category Filter & Archived Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition border ${
              showArchived
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Arsip ({archivedCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari kebutuhan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Needs Grid */}
      {filteredNeeds.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/30">
          <Package className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-300">
            {showArchived ? 'Tidak ada kebutuhan yang diarsipkan' : 'Tidak ada kebutuhan ditemukan'}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {showArchived
              ? 'Kebutuhan yang tidak aktif dapat diarsipkan agar tidak memenuhi daftar.'
              : 'Tambahkan barang kebutuhan baru untuk memulai pemantauan rotasi.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNeeds.map((need) => {
            const Icon = getNeedIcon(need.icon);
            const dutyUser = users.find((u) => u.id === need.currentDutyMemberId);
            const isMyDuty = need.currentDutyMemberId === currentUserId;
            const cluster = clusters.find((c) => c.id === need.clusterId);

            return (
              <div
                key={need.id}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onSelectNeed(need.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl font-bold"
                        style={{ backgroundColor: `${need.color}20`, color: need.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {need.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant={
                              need.archived
                                ? 'default'
                                : need.status === 'AVAILABLE'
                                ? 'success'
                                : need.status === 'RUNNING_LOW'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {need.archived
                              ? 'Diarsipkan'
                              : need.status === 'AVAILABLE'
                              ? 'Aman'
                              : need.status === 'RUNNING_LOW'
                              ? 'Menipis'
                              : 'Habis'}
                          </Badge>
                          {cluster && (
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                              {cluster.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {onOpenConfigureNeed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenConfigureNeed(need);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                        title="Konfigurasi kebutuhan"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Consumption Details */}
                  <div
                    onClick={() => onSelectNeed(need.id)}
                    className="mt-4 grid grid-cols-2 gap-2 text-xs rounded-xl bg-zinc-900/40 p-2.5 border border-zinc-800/60 cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Rata-rata habis</span>
                      <span className="font-semibold text-zinc-200 mt-0.5 block">
                        {need.averageConsumptionDays > 0
                          ? `${need.averageConsumptionDays} hari`
                          : 'Belum cukup data'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Estimasi beli</span>
                      <span className="font-semibold text-emerald-400 mt-0.5 block font-mono">
                        {need.expectedNextPurchaseDate
                          ? new Date(need.expectedNextPurchaseDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Segera'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Duty Turn */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <RotateCw className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Giliran:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dutyUser?.avatarUrl && (
                      <img
                        src={dutyUser.avatarUrl}
                        alt={dutyUser.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span
                      className={`font-semibold ${
                        isMyDuty ? 'text-amber-400 font-bold' : 'text-zinc-200'
                      }`}
                    >
                      {isMyDuty ? 'Kamu' : dutyUser?.name?.split(' ')[0] || 'Otomatis'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
