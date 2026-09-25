import React, { useEffect, useState } from 'react';
import {
  Settings,
  Users,
  Layers,
  Plane,
  Send,
  CheckCircle2,
  Check,
  ShieldCheck,
  Play,
  RotateCw,
  Plus,
} from 'lucide-react';
import { House, HouseMember, NeedCluster, TelegramSettings, User } from '../../types';
import { api } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface SettingsHubProps {
  house: House;
  members: (HouseMember & { user?: User })[];
  clusters: NeedCluster[];
  users: User[];
  currentUserId: string;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  house,
  members,
  clusters,
  users,
  currentUserId,
}) => {
  const [profName, setProfName] = useState(users.find(u => u.id === currentUserId)?.name || '');
  const [profUsername, setProfUsername] = useState(users.find(u => u.id === currentUserId)?.username || '');
  const [profPhone, setProfPhone] = useState(users.find(u => u.id === currentUserId)?.phone || '');
  const [profAvatar, setProfAvatar] = useState(users.find(u => u.id === currentUserId)?.avatarUrl || '');
  const [profPass, setProfPass] = useState('');
  const [isSavingProf, setIsSavingProf] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProf(true);
    try {
      await fetch(`/api/users/${currentUserId}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profName, username: profUsername, phone: profPhone, avatarUrl: profAvatar, password: profPass }) });
      alert('Profil berhasil diperbarui!');
    } catch(e) { alert('Gagal'); }
    setIsSavingProf(false);
  };

  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'CLUSTERS' | 'AVAILABILITY' | 'TELEGRAM' | 'QA'>('MEMBERS');

  // Telegram Settings State
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings | null>(null);
  const [isCreatingCluster, setIsCreatingCluster] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [newClusterDesc, setNewClusterDesc] = useState('');
  const [newClusterMembers, setNewClusterMembers] = useState<string[]>([]);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [notifyOnDuty, setNotifyOnDuty] = useState(true);
  const [notifyOnPurchase, setNotifyOnPurchase] = useState(true);
  const [notifyOnSplitBill, setNotifyOnSplitBill] = useState(true);
  const [notifyOnMaintenance, setNotifyOnMaintenance] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Availability State
  const [availabilityList, setAvailabilityList] = useState<any[]>([]);
  const [isAwayModalOpen, setIsAwayModalOpen] = useState(false);
  const [awayStartDate, setAwayStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [awayEndDate, setAwayEndDate] = useState('');
  const [awayReason, setAwayReason] = useState('Pulang Kampung');

  // QA Unit Tests State
  const [qaResults, setQaResults] = useState<any>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);

  useEffect(() => {
    loadTelegram();
    loadAvailability();
  }, [house.id]);

  const loadTelegram = async () => {
    try {
      const res = await api.getTelegramSettings(house.id);
      setTelegramSettings(res);
      setBotToken(res.botToken || '');
      setChatId(res.chatId || '');
      setNotifyOnDuty(res.notifyOnDuty);
      setNotifyOnPurchase(res.notifyOnPurchase);
      setNotifyOnSplitBill(res.notifyOnSplitBill);
      setNotifyOnMaintenance(res.notifyOnMaintenance);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAvailability = async () => {
    try {
      const res = await api.getAvailability(house.id);
      setAvailabilityList(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTelegram = async () => {
    try {
      setIsSavingTelegram(true);
      await api.saveTelegramSettings(house.id, {
        botToken,
        chatId,
        notifyOnDuty,
        notifyOnPurchase,
        notifyOnSplitBill,
        notifyOnMaintenance,
      });
      alert('Pengaturan Telegram tersimpan!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      const res = await api.sendTestTelegram(
        `🔔 [Kontrakanku Bot] Tes koneksi berhasil untuk ${house.name}!\nSemua notifikasi siap disalurkan ke grup.`
      );
      setTestResult(res);
    } catch (err: any) {
      alert(err.message || 'Gagal tes kirim');
    }
  };

  const handleAddAway = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAvailability({
        houseId: house.id,
        memberId: currentUserId,
        startDate: awayStartDate,
        endDate: awayEndDate,
        status: 'AWAY',
        reason: awayReason,
      });
      setIsAwayModalOpen(false);
      loadAvailability();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan');
    }
  };

  const handleRunQA = async () => {
    try {
      setIsRunningQA(true);
      const res = await api.runDomainVerification();
      setQaResults(res);
    } catch (err: any) {
      alert(err.message || 'Gagal menjalankan tes');
    } finally {
      setIsRunningQA(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>House Configuration & Integrations</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Pengaturan Rumah</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Atur anggota rumah, kluster tugas, periode keluar/cuti, dan bot Telegram.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'MEMBERS', label: 'Penghuni Rumah', icon: Users },
          { id: 'CLUSTERS', label: 'Kluster Kebutuhan', icon: Layers },
          { id: 'AVAILABILITY', label: 'Ketersediaan / Cuti', icon: Plane },
          { id: 'TELEGRAM', label: 'Integrasi Telegram', icon: Send },
          { id: 'QA', label: 'Verifikasi Logika Domain', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MEMBERS */}
      {activeTab === 'MEMBERS' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Daftar Penghuni ({members.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Setiap anggota terdaftar dalam rotasi tugas dan pembagian split bill.
              </p>
            </div>
            <button onClick={() => setIsCreatingCluster(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm">
              <Plus className="w-4 h-4" /> Tambah Kluster
            </button>
          </div>

          {isCreatingCluster && (
            <div className="mb-4 p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 space-y-3 animate-in fade-in slide-in-from-top-2">
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Nama Kluster</label>
                  <input type="text" value={newClusterName} onChange={e => setNewClusterName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:border-emerald-500 outline-none text-xs" placeholder="Grup Listrik Atas" />
               </div>
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Deskripsi (Opsional)</label>
                  <input type="text" value={newClusterDesc} onChange={e => setNewClusterDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:border-emerald-500 outline-none text-xs" />
               </div>
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Pilih Anggota</label>
                  <div className="flex flex-wrap gap-2">
                     {users.map(u => (
                        <label key={u.id} className="flex items-center gap-1.5 text-xs text-white bg-zinc-900 border border-zinc-700 px-2 py-1 rounded cursor-pointer">
                           <input type="checkbox" checked={newClusterMembers.includes(u.id)} onChange={e => {
                              if (e.target.checked) setNewClusterMembers([...newClusterMembers, u.id]);
                              else setNewClusterMembers(newClusterMembers.filter(id => id !== u.id));
                           }} />
                           {u.name}
                        </label>
                     ))}
                  </div>
               </div>
               <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsCreatingCluster(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition">Batal</button>
                  <button onClick={async () => {
                     if (!newClusterName) return;
                     try {
                        const { api } = require('../../services/apiClient');
                        await api.createCluster({ houseId: house.id, name: newClusterName, description: newClusterDesc, memberIds: newClusterMembers });
                        window.dispatchEvent(new CustomEvent('refreshCalendar')); // trigger reload in App.tsx
                        setIsCreatingCluster(false);
                        setNewClusterName('');
                        setNewClusterMembers([]);
                     } catch(e) { alert('Gagal'); }
                  }} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition">Simpan Kluster</button>
               </div>
            </div>
          )}

          <div className="divide-y divide-zinc-800/60">
            {members.map((m) => {
              const u = m.user;
              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={u?.avatarUrl}
                      alt={u?.name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{u?.name}</span>
                        {m.role === 'ADMIN' && (
                          <Badge variant="purple" size="sm">
                            Admin Rumah
                          </Badge>
                        )}
                      </div>
                      <span className="text-zinc-400 text-[11px] block mt-0.5">
                        Bergabung sejak{' '}
                        {new Date(m.joinedAt).toLocaleDateString('id-ID', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant={m.role === 'ADMIN' ? 'purple' : 'default'} size="sm">
                      {m.role === 'OWNER'
                        ? 'Pemilik'
                        : m.role === 'ADMIN'
                        ? 'Admin Rumah'
                        : 'Penghuni Tetap'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CLUSTERS */}
      {activeTab === 'CLUSTERS' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Kluster Kebutuhan Rumah
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mengelompokkan barang bersama ke lantai atau zona tertentu sehingga giliran hanya dibebankan ke penghuni terkait.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clusters.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{c.name}</h4>
                  <Badge variant="info" size="sm">
                    {c.memberIds.length} Penghuni
                  </Badge>
                </div>
                <p className="text-zinc-400 mt-1">{c.description}</p>
                <div className="mt-3 pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
                  Anggota: {c.memberIds.map((id) => users.find((u) => u.id === id)?.name?.split(' ')[0]).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AVAILABILITY */}
      {activeTab === 'AVAILABILITY' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Status Ketersediaan & Cuti Rumah
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Saat penghuni sedang keluar kota atau cuti, mesin tugas akan melewati namanya dari giliran belanja.
              </p>
            </div>
            <button
              onClick={() => setIsAwayModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black text-xs transition"
            >
              + Catat Izin / Cuti
            </button>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {availabilityList.map((a) => {
              const u = users.find((user) => user.id === a.memberId);
              return (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{u?.name}</span>
                      <Badge variant="warning" size="sm">
                        {a.status}
                      </Badge>
                    </div>
                    <p className="text-zinc-400 mt-0.5">{a.reason || 'Keperluan pribadi'}</p>
                  </div>

                  <div className="text-right font-mono text-[11px] text-zinc-400">
                    {a.startDate} s/d {a.endDate || 'Seterusnya'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TELEGRAM INTEGRATION */}
      {activeTab === 'TELEGRAM' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-6">
          <div className="pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Integrasi Grup Telegram Kontrakan
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hubungkan bot Telegram untuk notifikasi giliran belanja, stok menipis, dan rekap otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Telegram Bot Token</label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWx"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Group Chat ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100987654321"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-xs">
            <span className="font-bold text-white block mb-2">Event yang Dikirim ke Grup:</span>
            {[
              { label: 'Giliran Belanja Baru Terbit', state: notifyOnDuty, set: setNotifyOnDuty },
              { label: 'Peringatan Stok & Pembelian Barang', state: notifyOnPurchase, set: setNotifyOnPurchase },
              { label: 'Tagihan Split Bill Baru', state: notifyOnSplitBill, set: setNotifyOnSplitBill },
              { label: 'Pembaruan Tiket Pemeliharaan', state: notifyOnMaintenance, set: setNotifyOnMaintenance },
            ].map((ev, i) => (
              <label key={i} className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ev.state}
                  onChange={(e) => ev.set(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <span>{ev.label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <button
              onClick={handleTestTelegram}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs transition"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Kirim Pesan Tes Telegram</span>
            </button>

            <button
              onClick={handleSaveTelegram}
              disabled={isSavingTelegram}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black text-xs transition disabled:opacity-50"
            >
              {isSavingTelegram ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>

          {testResult && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tes Notifikasi Berhasil Terkirim
              </span>
              <p className="text-[11px] text-zinc-400">{testResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: QA UNIT TESTS RUNNER */}
      {activeTab === 'PROFILE' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
               <img src={users.find(u => u.id === currentUserId)?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Profil Anda</h3>
              <p className="text-zinc-400 text-xs">Ubah informasi dasar dan kata sandi akun Anda di sini.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Nama Lengkap</label>
                  <input type="text" value={profName} onChange={e => setProfName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm" />
               </div>
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Username</label>
                  <input type="text" value={profUsername} onChange={e => setProfUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm font-mono" />
               </div>
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Nomor HP / WA</label>
                  <input type="text" value={profPhone} onChange={e => setProfPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm font-mono" />
               </div>
            </div>
            <div className="space-y-4">
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Foto Profil (Pilih File)</label>
                  <input 
                     type="file" 
                     accept="image/*" 
                     onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                           const reader = new FileReader();
                           reader.onload = (ev) => {
                              if (ev.target?.result) {
                                 setProfAvatar(ev.target.result as string);
                              }
                           };
                           reader.readAsDataURL(file);
                        }
                     }} 
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30" 
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Pilih gambar dari perangkat Anda. Gambar akan otomatis tersimpan.</p>
               </div>
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Kata Sandi Baru</label>
                  <input type="password" value={profPass} onChange={e => setProfPass(e.target.value)} placeholder="Kosongkan jika tidak ingin mengubah" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm" />
               </div>
               <div className="pt-2">
                  <button onClick={handleSaveProfile} disabled={isSavingProf} className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition">
                    {isSavingProf ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'QA' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Verifikasi Mesin Logika Domain (QA Engine)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Jalankan rangkaian unit tests domain: Net balance, Greedy settlement plan, Duty rotation, QRIS EMVCo CRC16, and Split bill.
              </p>
            </div>
            <button
              onClick={handleRunQA}
              disabled={isRunningQA}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black text-xs transition disabled:opacity-50 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isRunningQA ? 'Menjalankan Tes...' : 'Jalankan Unit Tests'}</span>
            </button>
          </div>

          {qaResults ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400">
                <span className="font-bold">
                  Status Eksekusi: {qaResults.allPassed ? 'SEMUA TES LOLOS (PASSED)' : 'ADA KEGAGALAN'}
                </span>
                <span className="font-mono">{qaResults.tests.length} tests dijalankan</span>
              </div>

              <div className="space-y-1.5">
                {qaResults.tests.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-zinc-200">{t.name}</span>
                    </div>
                    <Badge variant="success" size="sm">
                      PASS
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-500">
              Klik "Jalankan Unit Tests" untuk memverifikasi kebenaran matematika keuangan dan rotasi duty secara real-time.
            </div>
          )}
        </div>
      )}

      {/* Away Modal */}
      <Modal
        isOpen={isAwayModalOpen}
        onClose={() => setIsAwayModalOpen(false)}
        title="Catat Periode Cuti / Keluar Kota"
        subtitle="Nama kamu akan otomatis dilewati dari giliran belanja selama periode ini."
        maxWidth="md"
      >
        <form onSubmit={handleAddAway} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Mulai Tanggal</label>
              <input
                type="date"
                value={awayStartDate}
                onChange={(e) => setAwayStartDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={awayEndDate}
                onChange={(e) => setAwayEndDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Alasan</label>
            <input
              type="text"
              value={awayReason}
              onChange={(e) => setAwayReason(e.target.value)}
              placeholder="Contoh: Pulang Kampung / Liburan"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAwayModalOpen(false)}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 font-bold text-black"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
