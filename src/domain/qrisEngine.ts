/**
 * QRIS EMVCo TLV Engine
 * Follows Bank Indonesia QRIS specifications (PADG No. 21/18/PADG/2019)
 * and EMVCo QR Code Merchant-Presented Mode specifications.
 *
 * Supports converting ANY static QRIS (GoPay, BCA, Mandiri, ShopeePay, DANA, OVO, etc.)
 * into a valid dynamic QRIS with custom nominal, merchant preservation, and exact CRC16 checksum.
 */

export interface TLVTag {
  tag: string;
  length: number;
  value: string;
}

export interface ParsedQRIS {
  isValid: boolean;
  rawPayload: string;
  tags: Map<string, string>;
  merchantName: string;
  merchantCity: string;
  postalCode?: string;
  acquirerName: string;
  nmid?: string;
  isDynamic: boolean;
  currentAmount?: number;
  currency: string;
  error?: string;
}

export interface DynamicQRISResult {
  success: boolean;
  dynamicPayload: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  acquirerName: string;
  nmid?: string;
  crc: string;
  explanation: {
    originalType: 'STATIC' | 'DYNAMIC';
    newType: 'DYNAMIC';
    tag01: string;
    tag54: string;
    crc16: string;
  };
}

/**
 * calculateCRC16:
 * EMVCo CRC-16 / CCITT (polynomial 0x1021, initial value 0xFFFF, no xorout).
 * This is the mandatory standard for Bank Indonesia QRIS Tag 63.
 */
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * parseEMVCoTLV:
 * Parses a standard EMVCo Tag-Length-Value payload string into a Tag Map.
 */
export function parseEMVCoTLV(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) break;

    const tag = payload.substring(i, i + 2);
    const lengthStr = payload.substring(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);

    if (isNaN(length) || length < 0 || i + 4 + length > payload.length) {
      break;
    }

    const value = payload.substring(i + 4, i + 4 + length);
    map.set(tag, value);

    i = i + 4 + length;
  }

  return map;
}

/**
 * parseSubTLV:
 * Parses sub-tags within a template tag (e.g., Tag 26, 51, 62).
 */
export function parseSubTLV(value: string): Map<string, string> {
  return parseEMVCoTLV(value);
}

/**
 * detectAcquirer:
 * Analyzes Merchant Account Information tags (Tag 26 to 51)
 * to identify which Indonesian payment provider or bank issued the QRIS.
 */
export function detectAcquirer(tags: Map<string, string>, rawPayload: string): string {
  const upper = rawPayload.toUpperCase();

  if (upper.includes('GOPAY') || upper.includes('GOJEK') || upper.includes('GO-PAY')) return 'GoPay (GoTo Financial)';
  if (upper.includes('SHOPEE') || upper.includes('AIRPAY')) return 'ShopeePay';
  if (upper.includes('DANA.ID') || upper.includes('DANA.WWW') || upper.includes('ID.CO.DANA')) return 'DANA';
  if (upper.includes('OVO')) return 'OVO (Bumi Parama Wisesa)';
  if (upper.includes('BCA') || upper.includes('BANK CENTRAL ASIA')) return 'Bank Central Asia (BCA)';
  if (upper.includes('MANDIRI') || upper.includes('LIVIN')) return 'Bank Mandiri (Livin)';
  if (upper.includes('BRI.') || upper.includes('BRIMO') || upper.includes('BANK RAKYAT')) return 'Bank Rakyat Indonesia (BRI)';
  if (upper.includes('BNI.') || upper.includes('BANK NEGARA INDONESIA')) return 'Bank Negara Indonesia (BNI)';
  if (upper.includes('LINKAJA') || upper.includes('FINNET') || upper.includes('TELKOM')) return 'LinkAja (Finarya)';
  if (upper.includes('NOBU')) return 'Bank Nobu';
  if (upper.includes('BSI') || upper.includes('SYARIAH INDONESIA')) return 'Bank Syariah Indonesia (BSI)';
  if (upper.includes('CIMB')) return 'CIMB Niaga (OCTO)';
  if (upper.includes('JAGO')) return 'Bank Jago';
  if (upper.includes('SEABANK')) return 'SeaBank';
  if (upper.includes('NETZME')) return 'Netzme';

  // Check Tag 51 (National QRIS)
  const tag51 = tags.get('51');
  if (tag51) {
    return 'QRIS Nasional (GPN / ASPI)';
  }

  return 'Merchant QRIS Nasional';
}

/**
 * extractNMID:
 * Extracts the National Merchant ID from Tag 51 subtag 02 if present.
 */
export function extractNMID(tags: Map<string, string>): string | undefined {
  const tag51 = tags.get('51');
  if (tag51) {
    const sub = parseSubTLV(tag51);
    const nmid = sub.get('02');
    if (nmid) return nmid;
  }
  return undefined;
}

/**
 * validateQRISPayload:
 * Validates whether a raw string conforms to Indonesian QRIS standard.
 */
export function validateQRISPayload(rawPayload: string): ParsedQRIS {
  if (!rawPayload || typeof rawPayload !== 'string' || rawPayload.trim().length < 20) {
    return {
      isValid: false,
      rawPayload: rawPayload || '',
      tags: new Map(),
      merchantName: '',
      merchantCity: '',
      acquirerName: '',
      isDynamic: false,
      currency: 'IDR',
      error: 'Payload QRIS kosong atau tidak terbaca.',
    };
  }

  const clean = rawPayload.trim();

  // EMVCo QRIS must start with Tag 00 length 02 value 01 ('000201')
  if (!clean.startsWith('000201')) {
    return {
      isValid: false,
      rawPayload: clean,
      tags: new Map(),
      merchantName: '',
      merchantCity: '',
      acquirerName: '',
      isDynamic: false,
      currency: 'IDR',
      error: 'Format QRIS tidak valid: Harus diawali dengan "000201".',
    };
  }

  const tags = parseEMVCoTLV(clean);

  // Validate Country Code Tag 58 = 'ID'
  const country = tags.get('58');
  if (country && country !== 'ID') {
    return {
      isValid: false,
      rawPayload: clean,
      tags,
      merchantName: tags.get('59') || '',
      merchantCity: tags.get('60') || '',
      acquirerName: 'Non-Indonesian QR',
      isDynamic: false,
      currency: 'IDR',
      error: 'Bukan QRIS standar Indonesia (Kode Negara Tag 58 bukan ID).',
    };
  }

  const merchantName = tags.get('59') || 'MERCHANT QRIS';
  const merchantCity = tags.get('60') || 'INDONESIA';
  const postalCode = tags.get('61');
  const pointOfInitiation = tags.get('01'); // 11 = static, 12 = dynamic
  const amountStr = tags.get('54');
  const acquirerName = detectAcquirer(tags, clean);
  const nmid = extractNMID(tags);
  const currencyCode = tags.get('53') === '360' ? 'IDR' : tags.get('53') || 'IDR';

  return {
    isValid: true,
    rawPayload: clean,
    tags,
    merchantName,
    merchantCity,
    postalCode,
    acquirerName,
    nmid,
    isDynamic: pointOfInitiation === '12',
    currentAmount: amountStr ? parseFloat(amountStr) : undefined,
    currency: currencyCode,
  };
}

/**
 * convertStaticToDynamicQRIS:
 * Core conversion function! Converts any static merchant QRIS (from BCA, GoPay, Mandiri,
 * ShopeePay, DANA, OVO, etc.) into an exact, verified Dynamic QRIS with custom amount.
 *
 * Rules:
 * 1. Tag 01 (Point of Initiation Method): Changed from '11' (Static) to '12' (Dynamic).
 * 2. Tag 54 (Transaction Amount): Injected with length and amount string (e.g. '540550000' for 50000).
 *    Placed canonically right after Tag 53 (Currency: 360).
 * 3. Tag 55 (Tip prompt): Removed or cleared so users are not prompted for tips.
 * 4. Tag 58-61: Preserved intact (Country: ID, Merchant Name, City, Postal).
 * 5. Tag 62 (Additional Data): Injected with purpose or reference label if provided.
 * 6. Tag 63 (CRC-16): Recalculated using standard CCITT polynomial 0x1021.
 */
export function convertStaticToDynamicQRIS(
  staticPayload: string,
  amount: number,
  options?: {
    billNumber?: string;
    purpose?: string;
    referenceLabel?: string;
  }
): DynamicQRISResult {
  const parsed = validateQRISPayload(staticPayload);
  if (!parsed.isValid) {
    throw new Error(parsed.error || 'Payload QRIS tidak valid');
  }

  const safeAmount = Math.max(1, Math.round(amount));
  const amountStr = safeAmount.toString();
  const amountLen = amountStr.length.toString().padStart(2, '0');
  const tag54Formatted = `54${amountLen}${amountStr}`;

  const tags = parseEMVCoTLV(parsed.rawPayload);

  // Check if original was static or dynamic
  const originalType = tags.get('01') === '12' ? 'DYNAMIC' : 'STATIC';

  // Construct payload with canonical Tag ordering
  // 1. Tag 00: '000201'
  let buffer = '000201';

  // 2. Tag 01: '010212' (Dynamic)
  buffer += '010212';

  // 3. Merchant Account Info tags: 02 through 51
  // We collect all tags between 02 and 51 in the order they appeared in the original QR
  for (const [tag, val] of tags.entries()) {
    const tagNum = parseInt(tag, 10);
    if (!isNaN(tagNum) && tagNum >= 2 && tagNum <= 51) {
      const lenStr = val.length.toString().padStart(2, '0');
      buffer += `${tag}${lenStr}${val}`;
    }
  }

  // 4. Tag 52: Merchant Category Code (MCC)
  const tag52 = tags.get('52') || '5411';
  buffer += `52${tag52.length.toString().padStart(2, '0')}${tag52}`;

  // 5. Tag 53: Transaction Currency (360 = IDR)
  const tag53 = tags.get('53') || '360';
  buffer += `53${tag53.length.toString().padStart(2, '0')}${tag53}`;

  // 6. Tag 54: Injected Transaction Amount
  buffer += tag54Formatted;

  // 7. Tag 55: Skip prompt tip indicator if static had 550201
  const tag55 = tags.get('55');
  if (tag55 && tag55 !== '01') {
    buffer += `55${tag55.length.toString().padStart(2, '0')}${tag55}`;
  }

  // 8. Tag 56, 57: Fees if any
  if (tags.has('56')) {
    const v = tags.get('56')!;
    buffer += `56${v.length.toString().padStart(2, '0')}${v}`;
  }
  if (tags.has('57')) {
    const v = tags.get('57')!;
    buffer += `57${v.length.toString().padStart(2, '0')}${v}`;
  }

  // 9. Tag 58: Country Code (must be ID)
  const tag58 = tags.get('58') || 'ID';
  buffer += `58${tag58.length.toString().padStart(2, '0')}${tag58}`;

  // 10. Tag 59: Merchant Name
  const tag59 = tags.get('59') || parsed.merchantName || 'MERCHANT KONTRAKAN';
  buffer += `59${tag59.length.toString().padStart(2, '0')}${tag59}`;

  // 11. Tag 60: Merchant City
  const tag60 = tags.get('60') || parsed.merchantCity || 'BANDUNG';
  buffer += `60${tag60.length.toString().padStart(2, '0')}${tag60}`;

  // 12. Tag 61: Postal Code
  if (tags.has('61')) {
    const tag61 = tags.get('61')!;
    buffer += `61${tag61.length.toString().padStart(2, '0')}${tag61}`;
  }

  // 13. Tag 62: Additional Data Field (Bill number, purpose, reference)
  let tag62Subtags = '';
  if (options?.billNumber) {
    const bn = options.billNumber.slice(0, 25);
    tag62Subtags += `01${bn.length.toString().padStart(2, '0')}${bn}`;
  }
  if (options?.referenceLabel) {
    const ref = options.referenceLabel.slice(0, 25);
    tag62Subtags += `05${ref.length.toString().padStart(2, '0')}${ref}`;
  }
  if (options?.purpose) {
    const p = options.purpose.slice(0, 25);
    tag62Subtags += `08${p.length.toString().padStart(2, '0')}${p}`;
  }

  if (tag62Subtags.length > 0) {
    buffer += `62${tag62Subtags.length.toString().padStart(2, '0')}${tag62Subtags}`;
  } else if (tags.has('62')) {
    const orig62 = tags.get('62')!;
    buffer += `62${orig62.length.toString().padStart(2, '0')}${orig62}`;
  }

  // 14. Any remaining tags >= 64
  for (const [tag, val] of tags.entries()) {
    const tagNum = parseInt(tag, 10);
    if (!isNaN(tagNum) && tagNum >= 64) {
      const lenStr = val.length.toString().padStart(2, '0');
      buffer += `${tag}${lenStr}${val}`;
    }
  }

  // 15. Tag 63: CRC-16 Calculation
  const payloadToSign = `${buffer}6304`;
  const crc = calculateCRC16(payloadToSign);
  const finalDynamicPayload = `${payloadToSign}${crc}`;

  return {
    success: true,
    dynamicPayload: finalDynamicPayload,
    amount: safeAmount,
    merchantName: tag59,
    merchantCity: tag60,
    acquirerName: parsed.acquirerName,
    nmid: parsed.nmid,
    crc,
    explanation: {
      originalType,
      newType: 'DYNAMIC',
      tag01: '010212',
      tag54: tag54Formatted,
      crc16: `6304${crc}`,
    },
  };
}

/**
 * injectQRISAmount:
 * Backwards-compatible wrapper around convertStaticToDynamicQRIS.
 */
export function injectQRISAmount(basePayload: string, amount: number): string {
  const result = convertStaticToDynamicQRIS(basePayload, amount);
  return result.dynamicPayload;
}

/**
 * createSampleQRISPayload:
 * Returns a valid template static QRIS payload for testing or users who haven't uploaded theirs yet.
 */
export function createSampleQRISPayload(merchantName: string = 'KAS MARKAS WARUNG'): string {
  const sanitizedName = merchantName.slice(0, 25).toUpperCase();
  const nameLen = sanitizedName.length.toString().padStart(2, '0');

  const base =
    `000201` + // Tag 00: Payload format 01
    `010211` + // Tag 01: Static QR (Point of Initiation Method = 11)
    `26600014ID.LINKAJA.WWW011893600999000000000002150000000000000000303UMI` + // Tag 26: Merchant Info LinkAja
    `51440014ID.CO.QRIS.WWW0215ID10200000000010303UMI` + // Tag 51: National QRIS / NMID
    `52045812` + // Tag 52: MCC
    `5303360` + // Tag 53: IDR (360)
    `5802ID` + // Tag 58: Country Code
    `59${nameLen}${sanitizedName}` + // Tag 59: Merchant Name
    `6007BANDUNG` + // Tag 60: City
    `610540287`; // Tag 61: Postal Code (GBA Bojongsoang)

  const withCRCHeader = `${base}6304`;
  const crc = calculateCRC16(withCRCHeader);
  return `${withCRCHeader}${crc}`;
}
