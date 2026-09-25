import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiClient';
import {
  validateQRISPayload,
  convertStaticToDynamicQRIS,
  createSampleQRISPayload,
  detectAcquirer,
  extractNMID,
  DynamicQRISResult,
  ParsedQRIS,
} from '../../domain/qrisEngine';
import { decodeQRFromImage } from '../../domain/qrisDecoder';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { User } from '../../types';
import {
  QrCode,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Save,
  RefreshCw,
  Edit3,
  AlertCircle,
  Upload,
  ArrowRight,
  Share2,
  CheckCircle2,
  Info,
  Sliders,
  FileText,
  Zap,
} from 'lucide-react';

interface UserQRISModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdated?: (updatedUser: User) => void;
  houseAddress?: string;
}

export const UserQRISModal: React.FC<UserQRISModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdated,
  houseAddress = 'GBA 3 Blok A8 no.5, RT.2/RW.10, Cipagalo, Bojongsoang, Bandung',
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'upload' | 'converter'>('card');

  // Base state
  const [merchantName, setMerchantName] = useState(user.name.toUpperCase());
  const [staticPayload, setStaticPayload] = useState(user.qrisPayload || createSampleQRISPayload(user.name.toUpperCase()));
  const [nominal, setNominal] = useState<number>(50000);
  const [purpose, setPurpose] = useState<string>('Iuran Kontrakan');

  // Live dynamic result
  const [dynamicResult, setDynamicResult] = useState<DynamicQRISResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [parsedStatic, setParsedStatic] = useState<ParsedQRIS | null>(null);

  // Interaction states
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Upload states
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [detectedFromUpload, setDetectedFromUpload] = useState<ParsedQRIS | null>(null);
  const [customTextPayload, setCustomTextPayload] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize modal data
  useEffect(() => {
    if (isOpen) {
      const name = user.name.toUpperCase();
      const payload = user.qrisPayload || createSampleQRISPayload(name);
      setMerchantName(name);
      setStaticPayload(payload);
      setCustomTextPayload(payload);
      setUploadedPreviewUrl(null);
      setUploadError(null);
      setDetectedFromUpload(null);
      setSaveSuccess(false);

      const parsed = validateQRISPayload(payload);
      setParsedStatic(parsed);
      if (parsed.isValid && parsed.merchantName) {
        setMerchantName(parsed.merchantName);
      }
    }
  }, [isOpen, user]);

  // Recalculate Dynamic QRIS whenever staticPayload, nominal, or purpose changes
  useEffect(() => {
    if (!isOpen || !staticPayload) return;

    try {
      const targetNominal = Math.max(1000, Number(nominal) || 10000);
      const res = convertStaticToDynamicQRIS(staticPayload, targetNominal, {
        purpose,
        referenceLabel: 'KONTRAKAN',
      });
      setDynamicResult(res);

      QRCode.toDataURL(res.dynamicPayload, {
        margin: 2,
        width: 440,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrDataUrl(url);
      });
    } catch (err: any) {
      console.error('Failed to convert static to dynamic QRIS:', err);
    }
  }, [isOpen, staticPayload, nominal, purpose]);

  // Handle image upload with jsQR decoder
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      setUploadError(null);

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setUploadedPreviewUrl(previewUrl);

      // Decode with client-side jsQR engine
      const rawDecoded = await decodeQRFromImage(file);
      const parsed = validateQRISPayload(rawDecoded);

      if (!parsed.isValid) {
        throw new Error(parsed.error || 'Gambar terbaca tetapi bukan kode QRIS standar Indonesia.');
      }

      setDetectedFromUpload(parsed);
      setCustomTextPayload(rawDecoded);
      if (parsed.merchantName) {
        setMerchantName(parsed.merchantName);
      }

      // Trigger celebrate feedback
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setUploadError(err.message || 'Gagal membaca QR dari gambar. Coba unggah gambar yang lebih jelas.');
      setDetectedFromUpload(null);
    } finally {
      setUploadLoading(false);
    }
  };

  // Save detected or customized QRIS to user account
  const handleSaveToAccount = async (payloadToSave: string, nameToSave: string) => {
    try {
      setSaving(true);
      const parsed = validateQRISPayload(payloadToSave);
      if (!parsed.isValid) {
        throw new Error(parsed.error || 'Payload QRIS tidak valid');
      }

      const res = await api.updateUserQRIS(user.id, payloadToSave, nameToSave);
      setStaticPayload(res.user.qrisPayload);
      setMerchantName(res.user.merchantName || nameToSave);
      setParsedStatic(parsed);
      setSaveSuccess(true);
      if (onUpdated) onUpdated(res.user);
      setTimeout(() => setSaveSuccess(false), 3500);
      setActiveTab('card');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan QRIS ke akun');
    } finally {
      setSaving(false);
    }
  };

  // Copy dynamic payload to clipboard
  const handleCopyPayload = () => {
    if (!dynamicResult?.dynamicPayload) return;
    navigator.clipboard.writeText(dynamicResult.dynamicPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download high-resolution PNG image
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRIS_Dinamis_${merchantName.replace(/\s+/g, '_')}_Rp${nominal}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!dynamicResult) return;
    const text = `*PEMBAYARAN QRIS DINAMIS*\n` +
      `👤 Penerima: *${merchantName}* (${dynamicResult.acquirerName})\n` +
      `💰 Nominal: *Rp ${nominal.toLocaleString('id-ID')}* (Otomatis Terkunci)\n` +
      `🏷️ Keperluan: ${purpose}\n` +
      `📍 Lokasi: ${houseAddress}\n\n` +
      `Silakan scan barcode QRIS menggunakan BCA Mobile, Livin by Mandiri, BRImo, BNI, GoPay, OVO, DANA, atau ShopeePay. Nominal sudah terisi otomatis tanpa perlu ketik manual!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const currentAcquirer = parsedStatic?.acquirerName || detectAcquirer(new Map(), staticPayload);
  const currentNmid = parsedStatic?.nmid || extractNMID(validateQRISPayload(staticPayload).tags);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QRIS Akun Saya (1 Akun 1 QRIS)"
      subtitle="Ubah QRIS statis dari merchant mana pun (GoPay, BCA, Mandiri, ShopeePay, DANA) menjadi QRIS Dinamis ber-nominal otomatis."
      maxWidth="xl"
    >
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'card'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QRIS Dinamis Saya</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'upload'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Unggah / Ubah QRIS Statis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('converter')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'converter'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Cara Kerja Konverter</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <div>
            <strong>QRIS Berhasil Disimpan!</strong> QRIS statis merchant Anda telah disinkronkan ke akun ini. Setiap tagihan sekarang otomatis menjadi QRIS Dinamis.
          </div>
        </div>
      )}

      {/* TAB 1: QRIS CARD & NOMINAL GENERATOR */}
      {activeTab === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-zinc-100">
          {/* LEFT: Indonesian Standard QRIS Card */}
          <div className="md:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[320px] rounded-2xl bg-white text-zinc-900 shadow-2xl border border-zinc-200 overflow-hidden">
              {/* National Banner */}
              <div className="bg-[#b91c1c] text-white px-3.5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">QRIS</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider bg-white text-red-700 px-1 py-0.5 rounded">
                    ASPI
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider block opacity-95">
                    DINAMIS OTOMATIS
                  </span>
                  <span className="text-[7.5px] opacity-80 block font-mono">EMVCo Merchant-Presented</span>
                </div>
              </div>

              {/* Merchant Details */}
              <div className="px-3.5 pt-3 pb-2 text-center border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="text-xs font-black uppercase text-zinc-900 tracking-tight truncate">
                    {merchantName}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[9.5px] font-medium text-emerald-700 mb-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100/90 font-bold">
                    {currentAcquirer}
                  </span>
                </div>

                <p className="text-[9px] text-zinc-500 font-normal truncate" title={houseAddress}>
                  {houseAddress}
                </p>

                <div className="mt-1 flex items-center justify-center gap-2 text-[8px] font-mono text-zinc-400">
                  <span>NMID: {currentNmid || `ID1020${user.id.replace(/[^0-9]/g, '').padEnd(10, '0')}`}</span>
                  <span>•</span>
                  <span>A01</span>
                </div>
              </div>

              {/* QR Image Area */}
              <div className="p-4 flex flex-col items-center justify-center bg-white">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QRIS Dinamis ${merchantName}`}
                    className="w-52 h-52 object-contain rounded-xl border border-zinc-200/90 shadow-xs"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center border border-dashed border-zinc-300 rounded-xl">
                    <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                )}

                {/* Locked Nominal Badge (Tag 54) */}
                <div className="mt-3 w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-800 uppercase mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nominal Terkunci (Tag 54)</span>
                  </div>
                  <div className="text-xl font-black text-emerald-950 font-mono tracking-tight">
                    Rp {nominal.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-emerald-700/80 block mt-0.5 font-medium">
                    {purpose}
                  </span>
                </div>
              </div>

              {/* Supported Banks / Wallets Strip */}
              <div className="bg-zinc-100/80 px-3 py-1.5 border-t border-zinc-200 text-center">
                <span className="text-[8.5px] text-zinc-500 font-semibold block truncate">
                  BCA • Mandiri • BRI • BNI • GoPay • OVO • DANA • ShopeePay
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Controls, Nominal Setter & Action */}
          <div className="md:col-span-6 space-y-4 text-xs">
            {/* Account Profile Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm truncate">{user.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                      1 AKUN 1 QRIS
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono block truncate">
                    Provider: <strong className="text-zinc-200">{currentAcquirer}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[11px] font-semibold transition"
              >
                Ganti QRIS
              </button>
            </div>

            {/* Set Nominal */}
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-300 uppercase text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Atur Nominal Tagihan Dinamis</span>
                </label>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  Rp {nominal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    value={nominal}
                    onChange={(e) => setNominal(Math.max(1000, parseInt(e.target.value, 10) || 1000))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Contoh: 50000"
                  />
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[15000, 25000, 50000, 75000, 100000, 150000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNominal(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
                      nominal === val
                        ? 'border-emerald-500 bg-emerald-950 text-emerald-300 font-bold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {(val / 1000)}k
                  </button>
                ))}
              </div>

              {/* Purpose Selector */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-semibold mb-1">
                  Keperluan / Catatan Pembayaran:
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Contoh: Iuran Kas, Galon, Listrik..."
                />
              </div>
            </div>

            {/* Dynamic Guarantee Explanation */}
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Otomatis Terkunci di Aplikasi Pembayar</span>
              </div>
              <p>
                Saat teman kontrakan men-scan QR ini menggunakan <strong>BCA Mobile, Livin, GoPay, ShopeePay, atau DANA</strong>, nominal <strong>Rp {nominal.toLocaleString('id-ID')}</strong> akan langsung terisi dan terkunci secara otomatis. Uang langsung masuk ke saldo rekening/e-wallet merchant milikmu!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 transition"
                title="Download gambar QR beresolusi tinggi"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Unduh QR</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 transition"
                title="Salin kode EMVCo"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="truncate">{copied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold transition"
                title="Bagikan rincian pembayaran ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="truncate">Kirim WA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD & CHANGE STATIC QRIS */}
      {activeTab === 'upload' && (
        <div className="space-y-5 text-xs text-zinc-200">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Unggah Screenshot / Foto QRIS Statis Anda</span>
            </h4>
            <p className="text-xs text-zinc-400">
              Punya QRIS statis dari <strong>GoPay, BCA, Mandiri, ShopeePay, DANA, OVO, LinkAja, atau Nobu</strong>? Cukup unggah fotonya di bawah. Sistem akan membaca barcode secara otomatis, mendeteksi nama merchant dan provider Anda, lalu menyimpannya untuk diubah menjadi QRIS dinamis kapan saja!
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/80 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {uploadLoading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Membaca kode QRIS dari gambar dengan mesin EMVCo...
                </span>
              </div>
            ) : uploadedPreviewUrl && detectedFromUpload ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={uploadedPreviewUrl}
                  alt="QR Preview"
                  className="w-28 h-28 object-contain rounded-xl border border-emerald-500/50 shadow-md"
                />
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>QRIS Berhasil Terbaca!</span>
                </div>
                <span className="text-[11px] text-zinc-400">Klik di sini untuk mengganti foto lain</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-zinc-200 text-sm">
                  Pilih Gambar atau Tarik Foto QRIS ke Sini
                </div>
                <div className="text-[11px] text-zinc-500">
                  Mendukung screenshot format PNG, JPG, WEBP dari aplikasi perbankan / e-wallet
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Detected Metadata Card */}
          {detectedFromUpload && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Hasil Deteksi QRIS Statis</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Valid EMVCo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Nama Merchant:</span>
                  <strong className="text-white text-sm">{detectedFromUpload.merchantName}</strong>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Provider / Bank:</span>
                  <strong className="text-emerald-400">{detectedFromUpload.acquirerName}</strong>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Kota Merchant:</span>
                  <span className="text-zinc-200">{detectedFromUpload.merchantCity}</span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">NMID / ID:</span>
                  <span className="text-zinc-300 font-mono text-[11px]">
                    {detectedFromUpload.nmid || 'Standar Nasional'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveToAccount(detectedFromUpload.rawPayload, detectedFromUpload.merchantName)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Sebagai QRIS Akun Saya'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Alternative */}
          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <h5 className="font-bold text-zinc-300 text-xs flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Atau Tempel (Paste) Kode String EMVCo QRIS Statis:</span>
            </h5>

            <textarea
              rows={3}
              value={customTextPayload}
              onChange={(e) => {
                setCustomTextPayload(e.target.value);
                const p = validateQRISPayload(e.target.value);
                if (p.isValid && p.merchantName) {
                  setMerchantName(p.merchantName);
                }
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-[11px] font-mono text-zinc-300 focus:border-emerald-500 focus:outline-none"
              placeholder="000201010211..."
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const std = createSampleQRISPayload(user.name.toUpperCase());
                  setCustomTextPayload(std);
                  setMerchantName(user.name.toUpperCase());
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline"
              >
                Reset ke Standar Markas Warung
              </button>

              <button
                type="button"
                onClick={() => handleSaveToAccount(customTextPayload, merchantName)}
                disabled={saving || !customTextPayload.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan Teks QRIS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONVERTER EXPLANATION & ARCHITECTURE */}
      {activeTab === 'converter' && (
        <div className="space-y-4 text-xs text-zinc-300">
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Bagaimana QRIS Statis Berubah Menjadi Dinamis?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Seluruh QRIS di Indonesia (baik dari <strong>BCA, Livin Mandiri, GoPay, ShopeePay, DANA, OVO, Nobu</strong>) wajib mematuhi standar <strong>Bank Indonesia & EMVCo</strong>. Karena semuanya menggunakan bahasa format yang sama (Tag-Length-Value / TLV), kita bisa menyuntikkan nominal secara resmi dan terverifikasi:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-amber-400">1. Tag 01: Mode Inisiasi</div>
              <div className="font-mono text-white text-xs bg-zinc-950 p-1.5 rounded border border-zinc-800">
                010211 ➔ 010212
              </div>
              <p className="text-[11px] text-zinc-400">
                Nilai <code>11</code> (Statis / input nominal bebas) diganti menjadi <code>12</code> (Dinamis / nominal dikunci oleh penerima).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400">2. Tag 54: Nominal Transaksi</div>
              <div className="font-mono text-white text-xs bg-zinc-950 p-1.5 rounded border border-zinc-800">
                540550000 (Rp 50.000)
              </div>
              <p className="text-[11px] text-zinc-400">
                Tag 54 disuntikkan langsung setelah mata uang rupiah (Tag 53: 360), membawa nominal yang tepat.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-sky-400">3. Tag 63: Checksum CRC-16</div>
              <div className="font-mono text-white text-xs bg-zinc-950 p-1.5 rounded border border-zinc-800">
                6304 + Polinomial 0x1021
              </div>
              <p className="text-[11px] text-zinc-400">
                Checksum dihitung ulang otomatis sehingga lolos validasi keamanan perbankan (BCA, Mandiri, BRI, dll.).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Apakah Uangnya Masuk ke Rekening Asli Pemilik QRIS?</span>
            </h5>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <strong>YA, 100% Masuk ke Rekening Anda!</strong> Tag informasi akun merchant (Tag 26 s/d 51 yang berisi rekening BCA, akun GoPay Merchant, saldo ShopeePay, atau DANA Bisnis Anda) <em>sama sekali tidak diubah</em>. Yang ditambahkan hanya instruksi nominal (Tag 54) dan pergantian mode (Tag 01: 12), sehingga aplikasi scanner pembayar langsung mengisi nominal otomatis tanpa ada perantara atau potongan pihak ketiga.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
            >
              <span>Uji QRIS Dinamis Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
