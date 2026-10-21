import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
  };

  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 sm:py-8 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widthClasses[maxWidth]} my-auto overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl text-zinc-100 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between pb-3.5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto py-3.5 flex-1 pr-1">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
