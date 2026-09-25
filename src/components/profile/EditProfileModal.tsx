import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { User } from '../../types';
import { User as UserIcon, Phone, Save, Mail } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser, onSuccess }) => {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profil Anda">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-4">
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-zinc-400 mb-1 text-xs font-semibold">Alamat Email (Tidak bisa diubah)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
            <input type="text" value={currentUser.email} disabled className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-zinc-500 cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label className="block text-zinc-300 mb-1 font-semibold">Nama Lengkap</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-zinc-300 mb-1 font-semibold">Username</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono" />
          </div>
        </div>

        <div>
          <label className="block text-zinc-300 mb-1 font-semibold">Nomor WhatsApp / HP</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono" />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl transition cursor-pointer">
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>
    </Modal>
  );
};
