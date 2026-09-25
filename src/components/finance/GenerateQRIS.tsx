import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/apiClient';
import { injectQRISAmount, createSampleQRISPayload } from '../../domain/qrisEngine';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Building2,
  User,
  ShieldCheck,
  RefreshCw,
  Share2,
  Clock,
  CheckCircle2,
  Receipt,
  Sparkles
} from 'lucide-react';
import { User as UserType } from '../../types';

export interface GenerateQRISProps {
  receiverId?: string;
  receiverName?: string;
  amount?: number;
  initialPurpose?: string;
  users?: UserType[];
  onPaymentSuccess?: (amount: number, notes?: string) => Promise<void> | void;
  houseName?: string;
  houseAddress?: string;
  compact?: boolean;
}

const PURPOSE_PRESETS = [
  { label: 'Iuran Kas Bulanan', amount: 100000, icon: '💳' },
  { label: 'Galon Air Aqua', amount: 22000, icon: '💧' },
  { label: 'Gas LPG 3kg', amount: 25000, icon: '🔥' },
  { label: 'Token Listrik PLN', amount: 50000, icon: '⚡' },
  { label: 'Peralatan & Kebersihan', amount: 30000, icon: '🧹' },
  { label: 'Pelunasan Split Bill', amount: 0, icon: '⚖️' },
  { label: 'Keperluan Lainnya', amount: 0, icon: '🏷️' },
];

const QUICK_AMOUNTS = [20000, 25000, 50000, 100000, 150000, 200000];

export const GenerateQRIS: React.FC<GenerateQRISProps> = ({
  receiverId: defaultReceiverId = 'kas_rumah',
  amount: defaultAmount = 100000,
  initialPurpose = 'Iuran Kas Bulanan',
  users = [],
  onPaymentSuccess,
  houseName = 'KONTRAKAN MARKAS WARUNG',
  houseAddress = 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Bojongsoang, Bandung',
  compact = false,
}) => {
  const [targetType, setTargetType] = useState<'kas' | 'member'>(
    defaultReceiverId && defaultReceiverId !== 'kas_rumah' && defaultReceiverId !== 'house_wallet' ? 'member' : 'kas'
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    defaultReceiverId && defaultReceiverId !== 'kas_rumah' ? defaultReceiverId : users[0]?.id || 'user_ilaa'
  );
  const [amount, setAmount] = useState<number>(defaultAmount || 100000);
  const [purpose, setPurpose] = useState<string>(initialPurpose);
  const [notes, setNotes] = useState<string>('');

  const [qrisPayload, setQrisPayload] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('KAS MARKAS WARUNG');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev <= 1 ? 900 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    generateQRIS();
  }, [targetType, selectedMemberId, amount, purpose]);

  const generateQRIS = async () => {
    try {
      setIsLoading(true);
      const safeAmount = Math.max(1000, Number(amount) || 1000);

      let targetReceiverId = 'kas_rumah';
      let targetName = 'KAS MARKAS WARUNG';

      if (targetType === 'member') {
        targetReceiverId = selectedMemberId;
        const member = users.find((u) => u.id === selectedMemberId);
        targetName = member ? member.name.toUpperCase() : 'ANGGOTA KONTRAKAN';
      }

      setMerchantName(targetName);

      try {
        const data = await api.getDynamicQRIS(targetReceiverId, safeAmount, purpose);
        setQrisPayload(data.rawPayload);
        setQrDataUrl(data.qrDataUrl);
        setMerchantName(data.receiverName || targetName);
      } catch (serverErr) {
        const member = users.find((u) => u.id === selectedMemberId);
        const base = (targetType === 'member' && member?.qrisPayload)
          ? member.qrisPayload
          : createSampleQRISPayload(targetName);

        const injected = injectQRISAmount(base, safeAmount);
        const dataUrl = await QRCode.toDataURL(injected, {
          margin: 2,
          width: 420,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        setQrisPayload(injected);
        setQrDataUrl(dataUrl);
      }
    } catch (err) {
      console.error('Failed to generate QRIS:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPayload = () => {
    if (!qrisPayload) return;
    navigator.clipboard.writeText(qrisPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyShare = () => {
    const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`;
    const targetText = targetType === 'kas' ? 'Kas Kontrakan (Bersama)' : merchantName;
    const shareText = `🔔 TAGIHAN QRIS ${houseName.toUpperCase()}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Nominal: ${formattedAmount}\n` +
      `📌 Keperluan: ${purpose}\n` +
      `🏦 Penerima: ${targetText}\n` +
      `📍 Alamat: ${houseAddress}\n` +
      (notes ? `📝 Catatan: ${notes}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Buka m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, OVO, DANA, ShopeePay), pilih QRIS dan scan kode ini. Nominal terisi otomatis!`;

    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRIS_${merchantName.replace(/\s+/g, '_')}_Rp${amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmPaid = async () => {
    try {
      setIsSubmitting(true);
      if (onPaymentSuccess) {
        await onPaymentSuccess(amount, notes || `QRIS Dinamis - ${purpose}`);
      } else {
        await api.createWalletTx({
          houseId: 'house_harmoni',
          type: 'INCOME',
          amount,
          actorId: selectedMemberId || 'user_ilaa',
          category: 'CONTRIBUTION',
          description: `Pembayaran QRIS: ${purpose}${notes ? ` (${notes})` : ''}`,
        });
      }

      setPaymentDone(true);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#3b82f6'],
        });
      } catch (cErr) {
        // silent
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6 shadow-xl">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <QrCode className="w-4 h-4" />
            <span>Bank Indonesia EMVCo QRIS Dynamic</span>
          </div>
          <h3 className="text-lg font-extrabold text-white tracking-tight">
            Generate QRIS Pembayaran Rumah
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pindai menggunakan aplikasi m-Banking atau e-Wallet apa saja dengan nominal otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <Sparkles className="w-3 h-3" />
            <span>Tag 54 Injected</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-6 space-y-4">
          {/* Target */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              1. Tujuan Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('kas')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  targetType === 'kas'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${targetType === 'kas' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">Kas Kontrakan</span>
                  <span className="text-[10px] text-zinc-400 block truncate">Markas Warung</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('member')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  targetType === 'member'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${targetType === 'member' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">Penghuni Rumah</span>
                  <span className="text-[10px] text-zinc-400 block truncate">Pilih anggota</span>
                </div>
              </button>
            </div>

            {targetType === 'member' && (
              <div className="mt-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-zinc-900 text-white">
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Keperluan */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              2. Keperluan Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {PURPOSE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setPurpose(p.label);
                    if (p.amount > 0) setAmount(p.amount);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition truncate ${
                    purpose === p.label
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nominal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                3. Nominal Pembayaran (Rp)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Rp {amount.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                Rp
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 py-2 text-sm font-bold text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition ${
                    amount === val
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {(val / 1000).toLocaleString('id-ID')}k
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              4. Catatan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Iuran Sept 2026 - Candra"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* QR Card & Preview */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-[310px] rounded-2xl bg-white text-zinc-900 shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#b91c1c] text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-red-800">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tighter">QRIS</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-white text-red-700 px-1 py-0.5 rounded">
                  ASPI
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider uppercase opacity-95">
                Pembayaran Nasional
              </span>
            </div>

            {/* Merchant Identity */}
            <div className="px-4 pt-3 pb-2 text-center border-b border-zinc-100">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-tight leading-tight">
                {merchantName}
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                {houseAddress}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-400">
                <span>NMID: ID1020000000001</span>
                <span>•</span>
                <span>A01</span>
              </div>
            </div>

            {/* QR Render */}
            <div className="p-4 flex flex-col items-center justify-center bg-white">
              {isLoading || !qrDataUrl ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center border border-dashed border-zinc-300 rounded-xl text-zinc-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Membuat QRIS Dinamis...</span>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt="QRIS Dinamis Markas Warung"
                  className="w-48 h-48 object-contain rounded-lg border border-zinc-100 shadow-sm"
                />
              )}

              {/* Injected Tag 54 Box */}
              <div className="mt-3 w-full bg-emerald-50 border border-emerald-300/80 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nominal Terkunci (Tag 54)</span>
                </div>
                <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                  Rp {amount.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-emerald-700 block font-medium mt-0.5">
                  {purpose}
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-zinc-50 px-4 py-2 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Berlaku: <strong className="font-mono text-zinc-700">{timeFormatted}</strong></span>
              </div>
              <button
                type="button"
                onClick={generateQRIS}
                className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* App Badges */}
          <div className="w-full max-w-[310px] mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block text-center mb-1.5">
              Bisa Di-scan Lewat Semua Aplikasi
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold text-zinc-300">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">BCA</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">Mandiri</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">BRImo</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">BNI</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-emerald-400">GoPay</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-purple-400">OVO</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-sky-400">DANA</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-orange-400">ShopeePay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unduh QR</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
            <span>{copiedShare ? 'Tersalin!' : 'Bagikan Tagihan'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPayload}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition"
          >
            {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">{copiedPayload ? 'String Disalin' : 'EMVCo String'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirmPaid}
          disabled={isSubmitting || paymentDone}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition shadow-sm ${
            paymentDone
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{paymentDone ? 'Tercatat di Kas Bersama' : isSubmitting ? 'Mencatat...' : 'Tandai Sudah Bayar'}</span>
        </button>
      </div>
    </div>
  );
};
