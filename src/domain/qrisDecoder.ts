import jsQR from 'jsqr';

/**
 * Reads an image file (PNG, JPG, WEBP) uploaded by the user,
 * draws it to a temporary in-memory canvas, and uses jsQR to decode
 * the raw EMVCo QRIS string.
 */
export async function decodeQRFromImage(file: File): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('QR decoding is only supported in browser environments');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale to reasonable dimensions if huge, or keep native
          let { width, height } = img;
          if (width > 2000 || height > 2000) {
            const scale = 2000 / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('Gagal menginisialisasi canvas untuk membaca QR'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Attempt 1: Native scan with inverted & normal
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          // Attempt 2: If failed, try grayscale contrast enhancement
          if (!code) {
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              // High contrast binarization
              const b = gray > 128 ? 255 : 0;
              d[i] = b;
              d[i + 1] = b;
              d[i + 2] = b;
            }
            code = jsQR(d, width, height, { inversionAttempts: 'attemptBoth' });
          }

          if (code && code.data && code.data.trim().length > 0) {
            resolve(code.data.trim());
          } else {
            reject(
              new Error(
                'Tidak dapat mendeteksi kode QR pada gambar. Pastikan gambar QRIS tidak buram, terpotong, atau silau.'
              )
            );
          }
        } catch (err: any) {
          reject(new Error(err.message || 'Gagal memproses gambar QR'));
        }
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat file gambar. Format mungkin tidak didukung.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar dari perangkat'));
    };

    reader.readAsDataURL(file);
  });
}
