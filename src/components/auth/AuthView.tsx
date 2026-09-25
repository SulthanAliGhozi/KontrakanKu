import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, CheckCircle2, MapPin, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AuthView: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');

  // Form states (empty by default for real production authentication)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Silakan masukkan alamat email.');
      return;
    }

    if (mode !== 'RESET' && !password) {
      setErrorMsg('Silakan masukkan kata sandi.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          setErrorMsg(error.message || 'Email atau kata sandi tidak cocok. Silakan coba lagi.');
        }
      } else if (mode === 'REGISTER') {
        if (!name.trim()) {
          setErrorMsg('Silakan isi nama lengkap Anda.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak sesuai.');
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUp(cleanEmail, password, name.trim(), phone.trim());
        if (error) {
          setErrorMsg(error.message || 'Pendaftaran gagal. Silakan coba lagi.');
        } else {
          setSuccessMsg('Pendaftaran berhasil! Anda telah masuk.');
        }
      } else if (mode === 'RESET') {
        const { error, message } = await resetPassword(cleanEmail);
        if (error) {
          setErrorMsg(error.message || 'Gagal mengirim instruksi pemulihan kata sandi.');
        } else {
          setSuccessMsg(message || `Tautan pemulihan kata sandi telah dikirim ke ${cleanEmail}.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Brand Header */}
      <div className="w-full max-w-lg text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-2xl shadow-lg mb-3">
          MW
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
          KONTRAKAN MARKAS WARUNG
        </h1>
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs text-center max-w-md mx-auto shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="leading-snug">GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Kec. Bojongsoang, Kabupaten Bandung, Jawa Barat 40287</span>
        </div>
        <p className="text-xs text-zinc-400 mt-2 font-medium">
          Sistem Operasi Manajemen Rumah Kontrakan & Shared Living
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-950 p-1 border border-zinc-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'LOGIN' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'REGISTER' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Daftar Member
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('RESET');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'RESET' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Reset Sandi
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Nama lengkap penghuni"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Username (Opsional)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="sulthan_ali"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nomor WhatsApp / HP</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              {mode === 'REGISTER' ? 'Email Pendaftaran' : 'Email atau Username'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type={mode === 'REGISTER' ? 'email' : 'text'}
                placeholder={mode === 'LOGIN' ? 'email / username' : 'nama@email.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          {mode !== 'RESET' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-300">Kata Sandi</label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('RESET');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-10 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'REGISTER' && (
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : mode === 'LOGIN' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Akun</span>
              </>
            ) : mode === 'REGISTER' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Daftar Akun Member Baru</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Kirim Link Pemulihan</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            KONTRAKAN MARKAS WARUNG • Database Terintegrasi Cloud SQL
          </p>
        </div>
      </div>
    </div>
  );
};
