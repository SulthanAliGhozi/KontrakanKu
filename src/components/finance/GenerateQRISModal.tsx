import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiClient';
import { injectQRISAmount, createSampleQRISPayload, validateQRISPayload, convertStaticToDynamicQRIS, detectAcquirer } from '../../domain/qrisEngine';
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
  Sparkles,
  Info,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { User as UserType } from '../../types';

export interface GenerateQRISModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId?: string;
  receiverName?: string;
  amount?: number;
  initialPurpose?: string;
  users?: UserType[];
  onPaymentMarked?: (amount: number, proofNotes?: string) => Promise<void>;
  houseName?: string;
  houseAddress?: string;
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

export const GenerateQRISModal: React.FC<GenerateQRISModalProps> = ({
  isOpen,
  onClose,
  receiverId: defaultReceiverId = 'kas_rumah',
  receiverName: defaultReceiverName = 'KAS MARKAS WARUNG',
  amount: defaultAmount = 100000,
  initialPurpose = 'Iuran Kas Bulanan',
  users = [],
  onPaymentMarked,
  houseName = 'KONTRAKAN MARKAS WARUNG',
  houseAddress = 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Bojongsoang, Bandung',
}) => {
  // Form States
  const [targetType, setTargetType] = useState<'kas' | 'member'>(
    defaultReceiverId && defaultReceiverId !== 'kas_rumah' && defaultReceiverId !== 'house_wallet' ? 'member' : 'kas'
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    defaultReceiverId && defaultReceiverId !== 'kas_rumah' ? defaultReceiverId : users[0]?.id || 'user_ilaa'
  );
  const [amount, setAmount] = useState<number>(defaultAmount || 100000);
  const [purpose, setPurpose] = useState<string>(initialPurpose);
  const [notes, setNotes] = useState<string>('');

  // Generated QRIS Data
  const [qrisPayload, setQrisPayload] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('KAS MARKAS WARUNG');
  const [acquirerName, setAcquirerName] = useState<string>('QRIS Nasional');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Timer: 15 minutes validity
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultReceiverId && defaultReceiverId !== 'kas_rumah' && defaultReceiverId !== 'house_wallet') {
        setTargetType('member');
        setSelectedMemberId(defaultReceiverId);
      } else {
        setTargetType('kas');
      }
      if (defaultAmount && defaultAmount > 0) {
        setAmount(defaultAmount);
      }
      if (initialPurpose) {
        setPurpose(initialPurpose);
      }
      setTimeLeftSeconds(900);
    }
  }, [isOpen, defaultReceiverId, defaultAmount, initialPurpose]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          return 900; // Reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Generate QRIS when target, amount, or purpose changes
  useEffect(() => {
    if (isOpen) {
      generateQRIS();
    }
  }, [isOpen, targetType, selectedMemberId, amount, purpose]);

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

      // Attempt to fetch from server endpoint
      try {
        const data = await api.getDynamicQRIS(targetReceiverId, safeAmount, purpose);
        setQrisPayload(data.rawPayload);
        setQrDataUrl(data.qrDataUrl);
        setMerchantName(data.receiverName || targetName);
        setAcquirerName(data.acquirerName || 'QRIS Nasional');
      } catch (serverErr) {
        // High-reliability Client-side fallback using qrisEngine & qrcode
        const member = users.find((u) => u.id === selectedMemberId);
        const base = (targetType === 'member' && member?.qrisPayload)
          ? member.qrisPayload
          : createSampleQRISPayload(targetName);

        const conversion = convertStaticToDynamicQRIS(base, safeAmount, {
          purpose,
          referenceLabel: 'KONTRAKAN',
        });

        const dataUrl = await QRCode.toDataURL(conversion.dynamicPayload, {
          margin: 2,
          width: 440,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        setQrisPayload(conversion.dynamicPayload);
        setQrDataUrl(dataUrl);
        setMerchantName(conversion.merchantName || targetName);
        setAcquirerName(conversion.acquirerName);
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
      `Silakan buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, OVO, DANA, ShopeePay), pilih QRIS dan scan kode ini. Nominal akan langsung terisi otomatis!`;

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
      if (onPaymentMarked) {
        await onPaymentMarked(amount, notes || `QRIS Dinamis - ${purpose}`);
      } else {
        // Fallback create wallet transaction directly
        await api.createWalletTx({
          houseId: 'house_harmoni',
          type: 'INCOME',
          amount,
          actorId: selectedMemberId || 'user_ilaa',
          category: 'CONTRIBUTION',
          description: `Pembayaran QRIS: ${purpose}${notes ? ` (${notes})` : ''}`,
        });
      }

      // Trigger Confetti!
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

      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate QRIS Pembayaran Rumah"
      subtitle={`Buat kode QRIS dinamis untuk iuran kas, kebutuhan, atau pelunasan di ${houseName}.`}
      maxWidth="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-zinc-100">
        {/* LEFT COLUMN: Controls & Form */}
        <div className="md:col-span-6 space-y-4">
          {/* Target Recipient Selector */}
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
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
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
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
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
              <div className="mt-2.5">
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

          {/* Keperluan / Purpose Selector */}
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

          {/* Nominal Input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                3. Nominal Pembayaran (Rp)
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
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
                placeholder="100000"
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

          {/* Optional Catatan */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              4. Catatan / Referensi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Iuran Sept 2026 / Kas Markas Warung"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Live QRIS Card & App Guides */}
        <div className="md:col-span-6 flex flex-col items-center">
          {/* Authentic QRIS Card Display */}
          <div className="w-full max-w-[320px] rounded-2xl bg-white text-zinc-900 shadow-2xl border border-zinc-200 overflow-hidden transition">
            {/* National QRIS Header */}
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

            {/* Merchant Identity & Address */}
            <div className="px-4 pt-3 pb-2 text-center border-b border-zinc-100">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-tight leading-tight">
                {merchantName}
              </h4>
              <div className="flex items-center justify-center gap-1 mt-0.5 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                  {acquirerName}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono text-[8.5px]">
                  Tag 01: 12 (Dinamis)
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5" title={houseAddress}>
                {houseAddress}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-400">
                <span>NMID: ID1020000000001</span>
                <span>•</span>
                <span>A01</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-4 flex flex-col items-center justify-center bg-white">
              {isLoading || !qrDataUrl ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center border border-dashed border-zinc-300 rounded-xl text-zinc-400 text-xs gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Membuat QRIS Dinamis...</span>
                </div>
              ) : (
                <div className="relative group">
                  <img
                    src={qrDataUrl}
                    alt="QRIS Dinamis Markas Warung"
                    className="w-52 h-52 object-contain rounded-lg border border-zinc-100 shadow-sm"
                  />
                  {/* Subtle watermarked overlay badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition bg-black/10 rounded-lg">
                    <span className="bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-zinc-800 shadow">
                      Scan via m-Banking
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic Amount Highlight Tag 54 */}
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

            {/* Card Footer: Timer & Security */}
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

          {/* Supported Banking Apps Badges */}
          <div className="w-full max-w-[320px] mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
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

      {/* FOOTER ACTIONS */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Tools: Download & Share */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition disabled:opacity-50"
            title="Download QRIS Image PNG"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unduh QR</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition"
            title="Salin rincian tagihan untuk WhatsApp/Telegram"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
            <span>{copiedShare ? 'Tersalin!' : 'Bagikan Tagihan'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPayload}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition"
            title="Salin string standar EMVCo TLV"
          >
            {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">{copiedPayload ? 'String Disalin' : 'EMVCo String'}</span>
          </button>
        </div>

        {/* Right Tools: Confirm & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleConfirmPaid}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Mencatat...' : 'Tandai Sudah Bayar'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
