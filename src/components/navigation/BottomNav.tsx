import React from 'react';
import { Home, Package, Calendar, Wallet, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  actionRequiredCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  actionRequiredCount = 0,
}) => {
  const items = [
    { id: 'home', label: 'Home', icon: Home, badge: actionRequiredCount > 0 ? actionRequiredCount : null },
    { id: 'kebutuhan', label: 'Kebutuhan', icon: Package, badge: null },
    { id: 'kalender', label: 'Kalender', icon: Calendar, badge: null },
    { id: 'keuangan', label: 'Keuangan', icon: Wallet, badge: null },
    { id: 'lainnya', label: 'Lainnya', icon: MoreHorizontal, badge: null },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg px-2 py-1.5 safe-area-pb">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-zinc-950">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium leading-none ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
