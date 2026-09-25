import React from 'react';
import { Home, Package, Calendar, Wallet, Wrench, Activity, Settings, UserCircle } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingDutiesCount?: number;
  unsettledDebtsCount?: number;
  openMaintenanceCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingDutiesCount = 0,
  unsettledDebtsCount = 0,
  openMaintenanceCount = 0,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, badge: null },
    { id: 'kebutuhan', label: 'Kebutuhan', icon: Package, badge: pendingDutiesCount > 0 ? pendingDutiesCount : null },
    { id: 'kalender', label: 'Kalender', icon: Calendar, badge: null },
    { id: 'keuangan', label: 'Keuangan', icon: Wallet, badge: unsettledDebtsCount > 0 ? unsettledDebtsCount : null },
    { id: 'pemeliharaan', label: 'Pemeliharaan', icon: Wrench, badge: openMaintenanceCount > 0 ? openMaintenanceCount : null },
    { id: 'aktivitas', label: 'Aktivitas & Rekap', icon: Activity, badge: null },
    { id: 'profil', label: 'Profil Akun', icon: UserCircle, badge: null },
    { id: 'pengaturan', label: 'Pengaturan Rumah', icon: Settings, badge: null },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/60 p-4 shrink-0 min-h-[calc(100vh-65px)]">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 text-[11px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-zinc-800">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Prinsip Markas Warung
          </span>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
            Record → Understand → Assign → Balance → Predict → Notify
          </p>
        </div>
      </div>
    </aside>
  );
};
