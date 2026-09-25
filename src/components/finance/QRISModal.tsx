import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiClient';
import { QrCode, CheckCircle2, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface QRISModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  amount: number;
  onPaymentMarked: (amount: number, proofNotes?: string) => Promise<void>;
}

export const QRISModal: React.FC<QRISModalProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  amount,
  onPaymentMarked,
}) => {
  const [qrisData, setQrisData] = useState<{
    rawPayload: string;
    qrDataUrl: string;
    receiverName: string;
    amount: number;
    merchantInfo: any;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofNotes, setProofNotes] = useState('');

  useEffect(() => {
    if (isOpen && receiverId && amount > 0) {
      loadQRIS();
    }
  }, [isOpen, receiverId, amount]);

  const loadQRIS = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDynamicQRIS(receiverId, amount);
      setQrisData(data);
    } catch (err) {
      console.error('Error loading QRIS:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPayload = () => {
    if (qrisData?.rawPayload) {
      navigator.clipboard.writeText(qrisData.rawPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmPay = async () => {
    try {
      setIsSubmitting(true);
      await onPaymentMarked(amount, proofNotes);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menandai pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran QRIS Dinamis"
      subtitle={`Bayar pelunasan ke ${receiverName} dengan nominal pas tanpa perlu input manual.`}
      maxWidth="md"
    >
      {isLoading || !qrisData ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          Membuat QRIS Dinamis dengan checksum EMVCo...
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Amount Badge Banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Nominal Terkunci (Injected Tag 54)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
              Rp {amount.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Penerima: <strong className="text-zinc-200">{receiverName}</strong>
            </span>
          </div>

          {/* QRIS Code Rendered */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-zinc-800 bg-white shadow-inner">
            <img
              src={qrisData.qrDataUrl}
              alt="QRIS Dinamis"
              className="w-56 h-56 object-contain rounded-lg"
            />
            <div className="mt-2 text-center text-zinc-800">
              <span className="text-[11px] font-bold tracking-wider uppercase block">
                QRIS Standar Pembayaran Nasional
              </span>
              <span className="text-[10px] text-zinc-500 block font-mono">
                CRC16 Validated • Dynamic (Tag 01: 12)
              </span>
            </div>
          </div>

          {/* EMVCo Payload Details (Collapsible / Scannable) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-300">EMVCo Payload String</span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin String'}</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-zinc-400 break-all bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
              {qrisData.rawPayload}
            </p>
          </div>

          {/* Optional Proof note */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Catatan / Bank Pengirim (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Transfer via BCA / GoPay Candra"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleConfirmPay}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-black transition shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Tandai Sudah Bayar'}</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
