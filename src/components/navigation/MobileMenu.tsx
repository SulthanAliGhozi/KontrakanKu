import React from 'react';
import { Wrench, Activity, UserCircle, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MobileMenuProps {
  onNavigate: (tab: string) => void;
  pendingDutiesCount?: number;
  openMaintenanceCount?: number;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  onNavigate,
  openMaintenanceCount = 0,
}) => {
  const { logout, user } = useAuth();
  
  const menuItems = [
    { id: 'pemeliharaan', label: 'Pemeliharaan', icon: Wrench, badge: openMaintenanceCount > 0 ? openMaintenanceCount : null },
    { id: 'aktivitas', label: 'Aktivitas & Rekap', icon: Activity, badge: null },
    { id: 'profil', label: 'Profil Akun', icon: UserCircle, badge: null },
    { id: 'pengaturan', label: 'Pengaturan Rumah', icon: Settings, badge: null },
  ];

  return (
    <div className="space-y-6 pb-24 fade-in">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 p-[2px] shadow-xl shadow-emerald-500/20">
          <img src={user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"} alt="User" className="w-full h-full rounded-2xl border-2 border-zinc-950 object-cover" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-zinc-400">{user?.email}</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition active:scale-[0.98]"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-zinc-800 rounded-xl text-zinc-300">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">{item.label}</span>
              </div>
              <div className="flex items-center space-x-3">
                {item.badge && (
                  <span className="bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold">Keluar Akun</span>
        </button>
      </div>
    </div>
  );
};
