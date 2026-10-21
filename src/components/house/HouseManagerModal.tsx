import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Home,
  Plus,
  Key,
  Users,
  Check,
  Shield,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Pencil,
  Phone,
  Mail,
  Lock,
  Building2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { House, HouseMember, User, UserRole } from '../../types';
import { api } from '../../services/apiClient';

interface HouseManagerModalProps {
  currentHouse: House;
  currentUserId: string;
  members: (HouseMember & { user?: User })[];
  allUsers: User[];
  onClose: () => void;
  onSelectHouse: (houseId: string) => void;
  onHouseUpdated: () => void;
}

export const HouseManagerModal: React.FC<HouseManagerModalProps> = ({
  currentHouse,
  currentUserId,
  members,
  allUsers,
  onClose,
  onSelectHouse,
  onHouseUpdated,
}) => {
  const [tab, setTab] = useState<'HOUSES' | 'MEMBERS' | 'JOIN'>('HOUSES');
  const [userHouses, setUserHouses] = useState<{ house: House; role: string; memberId: string; memberCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- HOUSE CRUD STATES ---
  const [isCreatingHouse, setIsCreatingHouse] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [newHouseInviteCode, setNewHouseInviteCode] = useState('');

  const generateRandomInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewHouseInviteCode(code);
  };

  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editHouseName, setEditHouseName] = useState('');
  const [editHouseAddress, setEditHouseAddress] = useState('');
  const [editHouseInviteCode, setEditHouseInviteCode] = useState('');

  // --- MEMBER CRUD STATES ---
  const [addMemberMode, setAddMemberMode] = useState<'EXISTING' | 'NEW_ACCOUNT'>('EXISTING');
  const [isAddingMemberOpen, setIsAddingMemberOpen] = useState(false);

  // Existing user form
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<UserRole>('MEMBER');

  // New account form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('MEMBER');

  // Edit member modal
  const [editingMember, setEditingMember] = useState<(HouseMember & { user?: User }) | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<UserRole>('MEMBER');
  const [editMemberPassword, setEditMemberPassword] = useState('');

  // Join house
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  useEffect(() => {
    loadUserHouses();
  }, [currentUserId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const loadUserHouses = async () => {
    try {
      const houses = await api.getUserHouses(currentUserId);
      setUserHouses(houses);
    } catch (e) {
      console.error('Failed to load user houses:', e);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // ==========================================
  // HOUSE CRUD HANDLERS
  // ==========================================

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { house } = await api.createHouse({
        name: newHouseName.trim(),
        address: newHouseAddress.trim(),
        creatorUserId: currentUserId,
        inviteCode: newHouseInviteCode.trim() ? newHouseInviteCode.trim().toUpperCase() : undefined,
      });
      setSuccessMsg(`Kontrakan "${house.name}" dengan kode unik "${house.inviteCode}" berhasil dibuat!`);
      setNewHouseName('');
      setNewHouseAddress('');
      setNewHouseInviteCode('');
      setIsCreatingHouse(false);
      await loadUserHouses();
      onSelectHouse(house.id);
      onHouseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat rumah kontrakan');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditHouse = (h: House, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHouse(h);
    setEditHouseName(h.name);
    setEditHouseAddress(h.address || '');
    setEditHouseInviteCode(h.inviteCode || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveHouseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHouse) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.updateHouse(editingHouse.id, {
        name: editHouseName.trim(),
        address: editHouseAddress.trim(),
        inviteCode: editHouseInviteCode.trim().toUpperCase(),
      });
      setSuccessMsg(`Data kontrakan "${editHouseName}" berhasil diperbarui!`);
      setEditingHouse(null);
      await loadUserHouses();
      onHouseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui data kontrakan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHouse = async (h: House, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userHouses.length <= 1) {
      alert('Tidak dapat menghapus kontrakan satu-satunya di sistem.');
      return;
    }
    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus kontrakan "${h.name}"?\nSemua jadwal dan data kas kontrakan ini akan dihapus permanen.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.deleteHouse(h.id);
      setSuccessMsg(`Kontrakan "${h.name}" berhasil dihapus.`);
      await loadUserHouses();
      onHouseUpdated();

      // If the deleted house was the current house, switch to another available house
      if (h.id === currentHouse.id) {
        const remaining = userHouses.filter((item) => item.house.id !== h.id);
        if (remaining.length > 0) {
          onSelectHouse(remaining[0].house.id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus kontrakan');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // MEMBER CRUD HANDLERS
  // ==========================================

  const handleAddExistingMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.addHouseMember(currentHouse.id, {
        userId: selectedUserToAdd,
        role: selectedRoleToAdd,
      });
      setSelectedUserToAdd('');
      setIsAddingMemberOpen(false);
      setSuccessMsg('Anggota berhasil ditambahkan ke kontrakan!');
      onHouseUpdated();
      await loadUserHouses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan anggota');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewMemberAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.createAndAddHouseMember(currentHouse.id, {
        name: newMemberName.trim(),
        email: newMemberEmail.trim().toLowerCase(),
        phone: newMemberPhone.trim(),
        password: newMemberPassword.trim() || 'Penghuni2026!',
        role: newMemberRole,
      });
      setSuccessMsg(`Akun untuk "${newMemberName}" berhasil dibuat dan otomatis terdaftar di rumah ini!`);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setNewMemberPassword('');
      setIsAddingMemberOpen(false);
      onHouseUpdated();
      await loadUserHouses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan penghuni baru');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await api.updateHouseMemberRole(currentHouse.id, memberId, role);
      setSuccessMsg('Peran anggota berhasil diperbarui!');
      onHouseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah peran');
    }
  };

  const startEditMember = (m: HouseMember & { user?: User }) => {
    const freshUser = allUsers.find((au) => au.id === m.userId) || m.user;
    setEditingMember(m);
    setEditMemberName(freshUser?.name || '');
    setEditMemberPhone(freshUser?.phone || '');
    setEditMemberRole((m.role as UserRole) || 'MEMBER');
    setEditMemberPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Update role if changed
      if (editingMember.role !== editMemberRole) {
        await api.updateHouseMemberRole(currentHouse.id, editingMember.id, editMemberRole);
      }

      // 2. Update profile / password if user exists
      if (editingMember.user?.id) {
        await api.updateUserProfile(editingMember.user.id, {
          name: editMemberName.trim(),
          phone: editMemberPhone.trim(),
          password: editMemberPassword.trim() || undefined,
        });
      }

      setSuccessMsg('Data penghuni berhasil diperbarui!');
      setEditingMember(null);
      onHouseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui data penghuni');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan "${memberName}" dari kontrakan ini?`)) return;
    setIsLoading(true);
    try {
      await api.removeHouseMember(currentHouse.id, memberId);
      setSuccessMsg(`"${memberName}" telah dikeluarkan dari kontrakan.`);
      onHouseUpdated();
      await loadUserHouses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus anggota');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { house } = await api.joinHouseByInvite({
        inviteCode: inviteCodeInput.trim().toUpperCase(),
        userId: currentUserId,
      });
      setSuccessMsg(`Berhasil bergabung ke "${house.name}"!`);
      setInviteCodeInput('');
      await loadUserHouses();
      onSelectHouse(house.id);
      onHouseUpdated();
      setTimeout(() => setTab('HOUSES'), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Kode undangan tidak valid');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueMembers = React.useMemo(() => {
    const map = new Map<string, (HouseMember & { user?: User })>();
    for (const m of members) {
      if (!map.has(m.userId)) {
        const freshUser = allUsers.find((au) => au.id === m.userId) || m.user;
        map.set(m.userId, { ...m, user: freshUser });
      }
    }
    return Array.from(map.values());
  }, [members, allUsers]);

  const availableUsersToAdd = allUsers.filter(
    (u) => !uniqueMembers.some((m) => m.userId === u.id)
  );

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kelola Rumah & Penghuni</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Multi-Kontrakan
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manajemen penuh kontrakan, anggota, dan kode undangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1.5 p-1 mt-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('HOUSES');
              setErrorMsg(null);
              setSuccessMsg(null);
              setEditingHouse(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'HOUSES' ? 'bg-zinc-800 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>Pilih & Kelola Rumah ({userHouses.length})</span>
          </button>
          <button
            onClick={() => {
              setTab('MEMBERS');
              setErrorMsg(null);
              setSuccessMsg(null);
              setEditingMember(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'MEMBERS' ? 'bg-zinc-800 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Penghuni ({uniqueMembers.length})</span>
          </button>
          <button
            onClick={() => {
              setTab('JOIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'JOIN' ? 'bg-zinc-800 text-white shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Gabung via Kode</span>
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: PILIH & KELOLA RUMAH (FULL CRUD) */}
          {/* ========================================================= */}
          {tab === 'HOUSES' && (
            <div className="space-y-4">
              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Daftar Kontrakan Tersedia</span>
                  <span className="text-[11px] text-zinc-400">Pilih untuk berpindah rumah, atau edit/hapus rumah</span>
                </div>
                {!isCreatingHouse && (
                  <button
                    onClick={() => {
                      setIsCreatingHouse(true);
                      setEditingHouse(null);
                      if (!newHouseInviteCode) {
                        generateRandomInviteCode();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Kontrakan</span>
                  </button>
                )}
              </div>

              {/* Form Tambah Rumah Baru */}
              {isCreatingHouse && (
                <form
                  onSubmit={handleCreateHouse}
                  className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Buat Kontrakan Baru</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingHouse(false)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Nama Kontrakan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Kost Asri Harmoni 2"
                        value={newHouseName}
                        onChange={(e) => setNewHouseName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Alamat Lengkap</label>
                      <input
                        type="text"
                        placeholder="Contoh: Jl. Sukolilo No. 12, Surabaya"
                        value={newHouseAddress}
                        onChange={(e) => setNewHouseAddress(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-zinc-300">
                          Kode Unik Kontrakan (Invite Code)
                        </label>
                        <button
                          type="button"
                          onClick={generateRandomInviteCode}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Acak Kode</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Contoh: MELATI88"
                          value={newHouseInviteCode}
                          onChange={(e) => setNewHouseInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                          className="w-full pl-9 pr-3 py-2 uppercase font-mono tracking-wider font-bold rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                          maxLength={12}
                          required
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        Kode unik ini yang akan dipakai calon penghuni untuk bergabung ke kontrakan ini secara eksklusif agar tidak tabrakan dengan kontrakan lain.
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !newHouseName.trim()}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan & Buka Kontrakan</span>
                  </button>
                </form>
              )}

              {/* Form Edit Rumah Terpilih */}
              {editingHouse && (
                <form
                  onSubmit={handleSaveHouseEdit}
                  className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/10 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Data: {editingHouse.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingHouse(null)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Nama Kontrakan</label>
                      <input
                        type="text"
                        value={editHouseName}
                        onChange={(e) => setEditHouseName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={editHouseAddress}
                        onChange={(e) => setEditHouseAddress(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Kode Undangan</label>
                      <input
                        type="text"
                        value={editHouseInviteCode}
                        onChange={(e) => setEditHouseInviteCode(e.target.value.toUpperCase())}
                        className="w-full uppercase font-mono tracking-wider rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-emerald-400 font-bold focus:border-blue-500 focus:outline-none"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoading || !editHouseName.trim()}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingHouse(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* List Kartu Rumah */}
              <div className="space-y-2.5">
                {userHouses.map(({ house, role, memberCount }) => {
                  const isCurrent = house.id === currentHouse.id;
                  const isCopied = copiedCodeId === house.id;
                  return (
                    <div
                      key={house.id}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-emerald-500/40 bg-emerald-950/20 ring-1 ring-emerald-500/20'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                      }`}
                    >
                      {/* Left: House info */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            isCurrent
                              ? 'bg-emerald-500 text-black'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {house.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{house.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                Aktif Saat Ini
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                              {role}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 block mt-1">
                            {house.address || 'Alamat belum diatur'}
                          </span>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{memberCount} Penghuni</span>
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="flex items-center gap-1.5 font-mono">
                              <Key className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-bold text-emerald-400">{house.inviteCode}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyCode(house.inviteCode, house.id);
                                }}
                                className="text-zinc-400 hover:text-white transition"
                                title="Salin kode undangan"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: CRUD Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {!isCurrent ? (
                          <button
                            onClick={() => {
                              onSelectHouse(house.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 text-xs font-bold transition flex items-center gap-1"
                            title="Beralih ke kontrakan ini"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Beralih</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            Dipilih
                          </span>
                        )}

                        {/* Edit House */}
                        <button
                          onClick={(e) => startEditHouse(house, e)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 transition"
                          title="Edit nama dan alamat kontrakan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete House */}
                        <button
                          onClick={(e) => handleDeleteHouse(house, e)}
                          disabled={userHouses.length <= 1}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-600 hover:text-white text-zinc-400 transition disabled:opacity-30 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
                          title={userHouses.length <= 1 ? 'Kontrakan satu-satunya tidak bisa dihapus' : 'Hapus kontrakan'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ANGGOTA PENGHUNI (FULL CRUD) */}
          {/* ========================================================= */}
          {tab === 'MEMBERS' && (
            <div className="space-y-4">
              {/* Header Action */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Penghuni di {currentHouse.name}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Kelola peran, tambah penghuni, atau edit profil akun
                  </span>
                </div>
                {!isAddingMemberOpen && (
                  <button
                    onClick={() => {
                      setIsAddingMemberOpen(true);
                      setEditingMember(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Tambah Penghuni</span>
                  </button>
                )}
              </div>

              {/* Form Tambah Anggota (Mode Switcher) */}
              {isAddingMemberOpen && (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tambah Penghuni Baru</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingMemberOpen(false)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Tutup
                    </button>
                  </div>

                  {/* Mode tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAddMemberMode('EXISTING')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        addMemberMode === 'EXISTING' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Pilih User Terdaftar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMemberMode('NEW_ACCOUNT')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        addMemberMode === 'NEW_ACCOUNT' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Daftarkan Akun Baru
                    </button>
                  </div>

                  {/* Mode A: Existing User */}
                  {addMemberMode === 'EXISTING' && (
                    <form onSubmit={handleAddExistingMember} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Pilih Pengguna yang Sudah Terdaftar
                          </label>
                          <select
                            value={selectedUserToAdd}
                            onChange={(e) => setSelectedUserToAdd(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                            required
                          >
                            <option value="" className="bg-zinc-900 text-white">
                              {availableUsersToAdd.length === 0 ? 'Semua user sudah bergabung' : 'Pilih pengguna...'}
                            </option>
                            {availableUsersToAdd.map((u) => (
                              <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Peran / Role</label>
                          <select
                            value={selectedRoleToAdd}
                            onChange={(e) => setSelectedRoleToAdd(e.target.value as UserRole)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="MEMBER" className="bg-zinc-900 text-white">Member (Penghuni)</option>
                            <option value="ADMIN" className="bg-zinc-900 text-white">Admin (Pengurus)</option>
                            <option value="SUPER_ADMIN" className="bg-zinc-900 text-white">Super Admin</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedUserToAdd || isLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Tambahkan ke Kontrakan</span>
                      </button>
                    </form>
                  )}

                  {/* Mode B: Direct Register New Account */}
                  {addMemberMode === 'NEW_ACCOUNT' && (
                    <form onSubmit={handleCreateNewMemberAccount} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Nama Lengkap</label>
                          <input
                            type="text"
                            placeholder="Contoh: Budi Santoso"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="Contoh: budi@gmail.com"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">No. WhatsApp / HP</label>
                          <input
                            type="text"
                            placeholder="Contoh: 08123456789"
                            value={newMemberPhone}
                            onChange={(e) => setNewMemberPhone(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Kata Sandi Awal</label>
                          <input
                            type="text"
                            placeholder="Default: Penghuni2026!"
                            value={newMemberPassword}
                            onChange={(e) => setNewMemberPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Peran di Kontrakan</label>
                          <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="MEMBER">Member (Penghuni Biasa)</option>
                            <option value="ADMIN">Admin (Pengurus Kontrakan)</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading || !newMemberName.trim() || !newMemberEmail.trim()}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Daftarkan Akun & Masukkan ke Kontrakan</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Form Edit Member Profile / Role */}
              {editingMember && (
                <form
                  onSubmit={handleSaveMemberEdit}
                  className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/10 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Penghuni: {editingMember.user?.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">No. WhatsApp / HP</label>
                      <input
                        type="text"
                        value={editMemberPhone}
                        onChange={(e) => setEditMemberPhone(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Peran di Kontrakan</label>
                      <select
                        value={editMemberRole}
                        onChange={(e) => setEditMemberRole(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="MEMBER">MEMBER (Penghuni Biasa)</option>
                        <option value="ADMIN">ADMIN (Pengurus)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Pemilik Platform)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Reset Kata Sandi (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Kosongkan jika tidak diubah"
                        value={editMemberPassword}
                        onChange={(e) => setEditMemberPassword(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {uniqueMembers.map((m) => {
                  const u = m.user;
                  const isSelf = m.userId === currentUserId;
                  const memberRole = (m.role || 'MEMBER').toUpperCase();
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={u?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={u?.name || 'User'}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{u?.name || 'Tanpa Nama'}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                Kamu
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                memberRole === 'SUPER_ADMIN'
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : memberRole === 'OWNER'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : memberRole === 'ADMIN'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {memberRole}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">{u?.email}</span>
                          {u?.phone && (
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{u.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: CRUD Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Quick Role Changer */}
                        <select
                          value={memberRole}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="text-[11px] bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="MEMBER" className="bg-zinc-900 text-white">MEMBER</option>
                          <option value="ADMIN" className="bg-zinc-900 text-white">ADMIN</option>
                          <option value="SUPER_ADMIN" className="bg-zinc-900 text-white">SUPER_ADMIN</option>
                        </select>

                        {/* Edit Button */}
                        <button
                          onClick={() => startEditMember(m)}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 transition"
                          title="Edit data dan kata sandi penghuni"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove from House Button */}
                        <button
                          onClick={() => handleRemoveMember(m.id, u?.name || 'Penghuni')}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-600 hover:text-white text-zinc-400 transition"
                          title="Keluarkan dari kontrakan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: GABUNG KONTRAKAN VIA KODE UNDANGAN */}
          {/* ========================================================= */}
          {tab === 'JOIN' && (
            <form onSubmit={handleJoinHouse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Kode Undangan Rumah</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Contoh: MARKASW"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    className="w-full uppercase font-mono tracking-widest text-center rounded-xl border border-zinc-800 bg-zinc-950 py-3 text-emerald-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none text-base font-bold"
                    maxLength={10}
                    required
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-2 block text-center">
                  Minta kode 6–8 karakter ini kepada teman serumah atau ketua kontrakan.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !inviteCodeInput.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Gabung ke Kontrakan Sekarang</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
