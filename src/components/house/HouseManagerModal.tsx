import React, { useState, useEffect } from 'react';
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
  const [tab, setTab] = useState<'SWITCH' | 'CREATE' | 'JOIN' | 'MEMBERS'>('SWITCH');
  const [userHouses, setUserHouses] = useState<{ house: House; role: string; memberId: string; memberCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form states
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<UserRole>('MEMBER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUserHouses();
  }, [currentUserId]);

  const loadUserHouses = async () => {
    try {
      const houses = await api.getUserHouses(currentUserId);
      setUserHouses(houses);
    } catch (e) {
      console.error(e);
    }
  };

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
      });
      setSuccessMsg(`Kontrakan "${house.name}" berhasil dibuat!`);
      setNewHouseName('');
      setNewHouseAddress('');
      await loadUserHouses();
      onSelectHouse(house.id);
      onHouseUpdated();
      setTimeout(() => setTab('SWITCH'), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat rumah');
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
      setTimeout(() => setTab('SWITCH'), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Kode undangan tidak valid');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
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
      setSuccessMsg('Anggota berhasil ditambahkan!');
      onHouseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan anggota');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await api.updateHouseMemberRole(currentHouse.id, memberId, role);
      onHouseUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Apakah kamu yakin ingin mengeluarkan anggota ini?')) return;
    try {
      await api.removeHouseMember(currentHouse.id, memberId);
      onHouseUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggota');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(currentHouse.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter out users already in the current house
  const availableUsersToAdd = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Rumah Kontrakan</h2>
              <p className="text-xs text-zinc-400">Pilih, buat, atau kelola penghuni kontrakan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 mt-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('SWITCH');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition ${
              tab === 'SWITCH' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pilih Rumah
          </button>
          <button
            onClick={() => {
              setTab('MEMBERS');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition ${
              tab === 'MEMBERS' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Anggota ({members.length})
          </button>
          <button
            onClick={() => {
              setTab('CREATE');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition ${
              tab === 'CREATE' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            + Buat Baru
          </button>
          <button
            onClick={() => {
              setTab('JOIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition ${
              tab === 'JOIN' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Gabung
          </button>
        </div>

        {/* Feedback message */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {/* TAB 1: SWITCH HOUSE */}
          {tab === 'SWITCH' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-400 block">
                Daftar Kontrakan yang Kamu Ikuti
              </span>
              <div className="space-y-2">
                {userHouses.map(({ house, role, memberCount }) => {
                  const isCurrent = house.id === currentHouse.id;
                  return (
                    <div
                      key={house.id}
                      onClick={() => {
                        onSelectHouse(house.id);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'border-emerald-500/40 bg-emerald-950/20 ring-1 ring-emerald-500/20'
                          : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isCurrent
                              ? 'bg-emerald-500 text-black'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {house.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{house.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                            {house.address || 'Alamat belum diatur'} • {memberCount} anggota
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                          {role}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current House Share Info */}
              <div className="mt-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Kode Undangan Rumah Aktif:</span>
                  <span className="text-sm font-extrabold font-mono text-emerald-400 tracking-wider">
                    {currentHouse.inviteCode}
                  </span>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS MANAGEMENT */}
          {tab === 'MEMBERS' && (
            <div className="space-y-4">
              {/* Add member form */}
              <form onSubmit={handleAddMember} className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                <span className="text-xs font-bold text-white block">Tambah Anggota ke Rumah Ini</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    <option value="" className="bg-zinc-900 text-white">Pilih pengguna...</option>
                    {availableUsersToAdd.map((u) => (
                      <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRoleToAdd}
                    onChange={(e) => setSelectedRoleToAdd(e.target.value as UserRole)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="MEMBER" className="bg-zinc-900 text-white">Anggota</option>
                    <option value="ADMIN" className="bg-zinc-900 text-white">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!selectedUserToAdd || isLoading}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambahkan Penghuni</span>
                </button>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block">
                  Daftar Anggota Saat Ini ({members.length})
                </span>
                {members.map((m) => {
                  const u = m.user;
                  const isSelf = m.userId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={u?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={u?.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{u?.name}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                                Kamu
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block">{u?.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.role === 'OWNER' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                            Owner
                          </span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                            className="text-[10px] bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none"
                          >
                            <option value="ADMIN" className="bg-zinc-900 text-white">Admin</option>
                            <option value="MEMBER" className="bg-zinc-900 text-white">Member</option>
                          </select>
                        )}

                        {m.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition"
                            title="Keluarkan dari rumah"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CREATE HOUSE */}
          {tab === 'CREATE' && (
            <form onSubmit={handleCreateHouse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nama Kontrakan</label>
                <input
                  type="text"
                  placeholder="Contoh: Kost Asri Harmoni / Paviliun 4B"
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Alamat / Lokasi</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Sukolilo No. 12, Surabaya"
                  value={newHouseAddress}
                  onChange={(e) => setNewHouseAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-[11px] text-zinc-400">
                Kamu akan otomatis menjadi <span className="text-white font-semibold">Owner</span> untuk kontrakan ini dan dapat membagikan kode undangan ke teman-temanmu.
              </div>

              <button
                type="submit"
                disabled={isLoading || !newHouseName.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Rumah Kontrakan</span>
              </button>
            </form>
          )}

          {/* TAB 4: JOIN HOUSE */}
          {tab === 'JOIN' && (
            <form onSubmit={handleJoinHouse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Kode Undangan Rumah</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Contoh: KONTRAK"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    className="w-full uppercase font-mono tracking-widest text-center rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 text-emerald-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none text-sm font-bold"
                    maxLength={10}
                    required
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Minta kode 6 karakter ini kepada teman serumah yang sudah membuat kontrakan.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !inviteCodeInput.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Gabung ke Kontrakan</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
