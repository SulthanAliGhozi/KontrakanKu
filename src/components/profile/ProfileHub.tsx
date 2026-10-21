import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/apiClient';

interface ProfileHubProps {
  users: User[];
  currentUserId: string;
  onRefresh?: () => void;
}

export const ProfileHub: React.FC<ProfileHubProps> = ({ users, currentUserId, onRefresh }) => {
  const [profEmail, setProfEmail] = useState(users.find(u => u.id === currentUserId)?.email || '');
  const [profName, setProfName] = useState(users.find(u => u.id === currentUserId)?.name || '');
  const [profUsername, setProfUsername] = useState(users.find(u => u.id === currentUserId)?.username || '');
  const [profPhone, setProfPhone] = useState(users.find(u => u.id === currentUserId)?.phone || '');
  const [profAvatar, setProfAvatar] = useState(users.find(u => u.id === currentUserId)?.avatarUrl || '');
  const [profPass, setProfPass] = useState('');
  const [isSavingProf, setIsSavingProf] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  React.useEffect(() => {
    const user = users.find(u => u.id === currentUserId);
    if (user) {
      setProfEmail(user.email || '');
      setProfName(user.name || '');
      setProfUsername(user.username || '');
      setProfPhone(user.phone || '');
      setProfAvatar(user.avatarUrl || '');
    }
  }, [users, currentUserId]);

  const handleSaveProfile = async () => {
    setIsSavingProf(true);
    try {
      await api.updateUserProfile(currentUserId, {
        email: profEmail,
        name: profName,
        username: profUsername,
        phone: profPhone,
        avatarUrl: profAvatar,
        password: profPass.trim().length >= 6 ? profPass.trim() : undefined,
      });
      onRefresh?.();
      alert('Profil berhasil diperbarui!');
    } catch(e: any) {
      alert(e.message || 'Gagal memperbarui profil');
    } finally {
      setIsSavingProf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Profil Akun</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Kelola informasi pribadi, avatar, dan keamanan akun Anda.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
               <img src={profAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Data Pribadi</h3>
              <p className="text-zinc-400 text-xs">Ubah detail di bawah dan klik simpan.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-semibold">Email</label>
                  <input type="email" value={profEmail} onChange={e => setProfEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm font-mono mb-4" />
               </div>
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
                     onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                           try {
                              setIsUploadingAvatar(true);
                              const url = await api.uploadAvatar(file);
                              setProfAvatar(url);
                           } catch (err: any) {
                              alert(err.message || 'Gagal mengunggah foto profil');
                           } finally {
                              setIsUploadingAvatar(false);
                           }
                        }
                     }} 
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30" 
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {isUploadingAvatar ? 'Mengunggah foto...' : 'Pilih gambar dari perangkat Anda. Foto otomatis tersimpan di server.'}
                  </p>
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
    </div>
  );
};
