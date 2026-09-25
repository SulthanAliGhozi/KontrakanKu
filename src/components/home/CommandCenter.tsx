import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Droplets,
  Flame,
  Wheat,
  Zap,
  Package,
  Wrench,
  Clock,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { CommandState } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { Need } from '../../types';

interface CommandCenterProps {
  state: CommandState;
  onNavigate: (tab: string, subView?: string) => void;
  onSelectNeed: (needId: string) => void;
  onQuickRecordPurchase: (need: Need) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  state,
  onNavigate,
  onSelectNeed,
  onQuickRecordPurchase,
}) => {
  const {
    house,
    currentUser,
    actionItems,
    needs,
    wallet,
    activeMaintenance,
    recentActivities,
    members,
    netBalances,
  } = state;

  // Time-aware greeting in Indonesian
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

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

  // Find user's current net position
  const myNetPosition = netBalances.find((n) => n.memberId === currentUser.id)?.netAmount || 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Greeting & House Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live House Command Center</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {getGreeting()}, {currentUser.name.split(' ')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Ini situasi terkini di {house.name} hari ini.
          </p>
        </div>

        {/* Top House Vitals Strip (Compact, calm, not aggressive KPI cards) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 shrink-0">
            <span className="text-[11px] text-zinc-400 block">Kas Rumah</span>
            <span className="text-sm font-bold text-white font-mono">
              Rp {wallet.balance.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 shrink-0">
            <span className="text-[11px] text-zinc-400 block">Posisi Pribadi</span>
            <span
              className={`text-sm font-bold font-mono ${
                myNetPosition > 0
                  ? 'text-emerald-400'
                  : myNetPosition < 0
                  ? 'text-rose-400'
                  : 'text-zinc-300'
              }`}
            >
              {myNetPosition > 0
                ? `+Rp ${myNetPosition.toLocaleString('id-ID')}`
                : myNetPosition < 0
                ? `-Rp ${Math.abs(myNetPosition).toLocaleString('id-ID')}`
                : 'Impas (Rp 0)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action-Required Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">
              Tindakan Perlu Dilakukan
            </h3>
            {actionItems.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold px-1.5">
                {actionItems.length}
              </span>
            )}
          </div>
        </div>

        {actionItems.length === 0 ? (
          /* Calm Empty State specified in Prompt: "Semua aman. Tidak ada tindakan yang perlu kamu lakukan." */
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 text-center flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              Semua aman. Tidak ada tindakan yang perlu kamu lakukan.
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              Kebutuhan rumah terpenuhi, giliranmu belum tiba, dan tidak ada tagihan tertunda yang menunggumu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 transition hover:border-amber-500/50 hover:bg-amber-950/20"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-amber-500/20 p-2 text-amber-400">
                    {item.type === 'DUTY' ? (
                      <Package className="w-4 h-4" />
                    ) : item.type === 'CONFIRM_SETTLEMENT' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {item.type === 'DUTY'
                          ? 'Giliran Pembelian'
                          : item.type === 'CONFIRM_SETTLEMENT'
                          ? 'Konfirmasi Masuk'
                          : 'Split Bill'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5 truncate">{item.title}</h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-snug">{item.description}</p>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-amber-500/20 flex items-center justify-end gap-2">
                  {item.type === 'DUTY' && item.data && (
                    <button
                      onClick={() => onQuickRecordPurchase(item.data)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Catat Pembelian</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (item.type === 'DUTY' && item.data) {
                        onSelectNeed(item.data.id);
                      } else {
                        onNavigate('keuangan');
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-white transition px-2 py-1"
                  >
                    <span>Detail Tindakan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Current Duties & Consumption Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">
              Status Kebutuhan & Giliran Rumah
            </h3>
            <p className="text-xs text-zinc-400">
              Siapa yang bertugas membeli kebutuhan bersama saat ini
            </p>
          </div>
          <button
            onClick={() => onNavigate('kebutuhan')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Semua Kebutuhan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {needs.slice(0, 6).map((need) => {
            const Icon = getNeedIcon(need.icon);
            const dutyMember = members.find((m) => m.userId === need.currentDutyMemberId)?.user;
            const isMyTurn = need.currentDutyMemberId === currentUser.id;

            return (
              <div
                key={need.id}
                onClick={() => onSelectNeed(need.id)}
                className={`group cursor-pointer rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
                  need.status === 'RUNNING_LOW' || need.status === 'EMPTY'
                    ? 'border-amber-500/40 bg-zinc-900/90'
                    : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold"
                      style={{ backgroundColor: `${need.color}20`, color: need.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {need.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant={
                            need.status === 'AVAILABLE'
                              ? 'success'
                              : need.status === 'RUNNING_LOW'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {need.status === 'AVAILABLE'
                            ? 'Aman'
                            : need.status === 'RUNNING_LOW'
                            ? 'Menipis'
                            : 'Habis'}
                        </Badge>
                        {need.expectedNextPurchaseDate && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            ~
                            {new Date(need.expectedNextPurchaseDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duty Holder Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Giliran berikutnya:</span>
                  <div className="flex items-center gap-1.5">
                    {dutyMember?.avatarUrl && (
                      <img
                        src={dutyMember.avatarUrl}
                        alt={dutyMember.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span
                      className={`font-semibold ${
                        isMyTurn ? 'text-amber-400 font-bold' : 'text-zinc-200'
                      }`}
                    >
                      {isMyTurn ? 'Kamu' : dutyMember?.name?.split(' ')[0] || 'Belum diatur'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Maintenance & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance Box */}
        <div className="lg:col-span-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Pemeliharaan Rumah
              </h3>
            </div>
            <button
              onClick={() => onNavigate('pemeliharaan')}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Lihat ({activeMaintenance.length})
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {activeMaintenance.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Semua fasilitas rumah berfungsi dengan baik.
              </p>
            ) : (
              activeMaintenance.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => onNavigate('pemeliharaan')}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 cursor-pointer transition text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">{ticket.title}</span>
                    <Badge variant={ticket.status === 'OPEN' ? 'warning' : 'info'} size="sm">
                      {ticket.status === 'OPEN' ? 'Baru' : 'Diproses'}
                    </Badge>
                  </div>
                  <p className="text-zinc-400 mt-1 text-[11px] line-clamp-2">
                    {ticket.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Aktivitas Rumah Terkini
              </h3>
            </div>
            <button
              onClick={() => onNavigate('aktivitas')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <span>Semua Aktivitas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-zinc-800/60">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Belum ada aktivitas tercatat.</p>
            ) : (
              recentActivities.slice(0, 5).map((act) => {
                const actor = members.find((m) => m.userId === act.actorId)?.user;
                return (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={actor?.avatarUrl}
                        alt={actor?.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 mr-1.5">
                          {actor?.name?.split(' ')[0] || 'Penghuni'}
                        </span>
                        <span className="text-zinc-400">{act.action}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
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
    </div>
  );
};
