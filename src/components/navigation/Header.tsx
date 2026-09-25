import React, { useState } from 'react';
import { Bell, Home, ChevronDown, Check, Sparkles, Download, LogOut, Settings, LogIn, MapPin, QrCode } from 'lucide-react';
import { House, HouseNotification, User } from '../../types';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { GenerateQRISModal } from '../finance/GenerateQRISModal';

interface HeaderProps {
  house: House;
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  notifications: HouseNotification[];
  onMarkNotificationsRead: () => void;
  onNavigate: (tab: string) => void;
  onOpenHouseManager?: () => void;
  onOpenUserQRIS?: () => void;
  onOpenEditProfile?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  house,
  users,
  currentUser,
  onSelectUser,
  notifications,
  onMarkNotificationsRead,
  onNavigate,
  onOpenHouseManager,
  onOpenUserQRIS,
  onOpenEditProfile,
  onSignOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const { isInstallable, install, isIOS } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showQRISModal, setShowQRISModal] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const houseName = house?.name || 'KONTRAKAN MARKAS WARUNG';
  const houseAddress = house?.address || 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Kec. Bojongsoang, Kabupaten Bandung, Jawa Barat 40287';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* House Identifier & Brand (Clickable to open House Manager) */}
        <button
          onClick={onOpenHouseManager}
          className="flex items-center gap-3 text-left group transition p-1.5 -m-1.5 rounded-2xl hover:bg-zinc-900/80 min-w-0"
          title="Klik untuk kelola atau beralih rumah kontrakan"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black shadow-inner group-hover:scale-105 transition-transform text-sm">
            MW
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase leading-none group-hover:text-emerald-300 transition-colors truncate">
                {houseName}
              </h1>
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                Pilih
              </span>
            </div>
            <p
              className="text-[11px] sm:text-xs text-zinc-300 leading-snug mt-1 truncate max-w-[200px] sm:max-w-md lg:max-w-xl font-normal"
              title={houseAddress}
            >
              {houseAddress}
            </p>
          </div>
        </button>

        {/* Right Tools: Switcher, PWA, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install App</span>
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Install iOS</span>
            </button>
          )}

          {/* Quick Generate QRIS Trigger */}
          <button
            onClick={() => setShowQRISModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-xl transition shadow-xs"
            title="Generate QRIS Pembayaran Rumah"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">QRIS</span>
          </button>

          {/* Active User Switcher / Login Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 hover:border-zinc-700 hover:bg-zinc-900 transition"
              title="Menu Akun & Profil Penghuni"
            >
              <img
                src={currentUser?.avatarUrl}
                alt={currentUser?.name}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-emerald-500/50"
              />
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-semibold text-zinc-200 leading-none truncate max-w-[100px]">
                  {currentUser?.name?.split(' ')[0]}
                </span>
                <span className="block text-[10px] text-emerald-400 leading-none mt-0.5 font-mono">
                  {currentUser?.email ? currentUser.email.split('@')[0] : 'Penghuni'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                {/* Current Active Account Header */}
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 mb-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                    Akun Aktif Saat Ini
                  </span>
                  <div className="flex items-center gap-2">
                    <img
                      src={currentUser?.avatarUrl}
                      alt={currentUser?.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
                      <p className="text-[10px] text-emerald-400 truncate font-mono">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Account Details & Role Badge */}
                <div className="px-2 py-1.5 rounded-lg bg-zinc-950/50 border border-zinc-800/80 mb-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-400 font-medium">Peran Pengguna:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        currentUser?.email?.toLowerCase() === 'sa.ghozi@gmail.com' || currentUser?.email?.toLowerCase() === 's.a.ghozi@gmail.com' || currentUser?.id === 'user_ghozi'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : currentUser?.email?.toLowerCase() === 'ilaaapedia@gmail.com' || currentUser?.id === 'user_ilaa'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {currentUser?.email?.toLowerCase() === 'sa.ghozi@gmail.com' || currentUser?.email?.toLowerCase() === 's.a.ghozi@gmail.com' || currentUser?.id === 'user_ghozi'
                        ? 'SUPER ADMIN'
                        : currentUser?.email?.toLowerCase() === 'ilaaapedia@gmail.com' || currentUser?.id === 'user_ilaa'
                        ? 'ADMIN'
                        : 'MEMBER'}
                    </span>
                  </div>
                  {currentUser?.phone && (
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>No. WhatsApp:</span>
                      <span className="font-mono text-zinc-300">{currentUser.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1">
                  {onOpenEditProfile && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenEditProfile();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"></path></svg>
                      <span>Edit Profil</span>
                    </button>
                  )}
                  
                  {onOpenUserQRIS && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenUserQRIS();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-950/50 border border-emerald-500/30 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>QRIS Akun Saya (1 Akun 1 QRIS)</span>
                    </button>
                  )}

                  {onOpenHouseManager && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenHouseManager();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                    >
                      <Home className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kelola Rumah Kontrakan</span>
                    </button>
                  )}

                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:bg-amber-950/30 transition"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Ganti Akun / Halaman Login</span>
                    </button>
                  )}

                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Sign Out)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
                if (unreadCount > 0) {
                  onMarkNotificationsRead();
                }
              }}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black ring-2 ring-zinc-950">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                  <span className="text-xs font-bold text-white">Notifikasi Rumah</span>
                  <span className="text-[11px] text-zinc-400">{notifications.length} tersimpan</span>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (n.link) onNavigate(n.link.replace('/', ''));
                        }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                          n.read
                            ? 'bg-zinc-800/40 border-zinc-800/60 text-zinc-400'
                            : 'bg-emerald-950/20 border-emerald-900/40 text-zinc-200'
                        }`}
                      >
                        <div className="font-semibold text-zinc-100 flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-300 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold">Install Kontrakanku di iOS Safari</h3>
            <div className="mt-3 space-y-2 text-xs text-zinc-300">
              <p>1. Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah atas) di toolbar Safari.</p>
              <p>2. Gulir ke bawah dan ketuk <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</p>
              <p>3. Aplikasi Kontrakanku akan terpasang layaknya aplikasi asli tanpa browser bar.</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Quick Generate QRIS Modal */}
      <GenerateQRISModal
        isOpen={showQRISModal}
        onClose={() => setShowQRISModal(false)}
        receiverId="kas_rumah"
        receiverName="KAS MARKAS WARUNG"
        amount={100000}
        initialPurpose="Iuran Kas Bulanan"
        users={users}
        houseName={houseName}
        houseAddress={houseAddress}
      />
    </header>
  );
};
