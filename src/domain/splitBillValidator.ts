import { SplitBillParticipant, SplitType } from '../types';

export interface SplitCalculationInput {
  totalAmount: number;
  splitType: SplitType;
  payerId: string;
  selectedMemberIds: string[];
  exactAmounts?: Record<string, number>; // memberId -> amount
}

export interface SplitCalculationResult {
  isValid: boolean;
  totalAmount: number;
  participants: SplitBillParticipant[];
  error?: string;
}

/**
 * calculateSplitBill:
 * Calculates and validates split distribution among participants.
 */
export function calculateSplitBill(input: SplitCalculationInput): SplitCalculationResult {
  const { totalAmount, splitType, selectedMemberIds, exactAmounts = {} } = input;

  if (totalAmount <= 0) {
    return {
      isValid: false,
      totalAmount,
      participants: [],
      error: 'Nominal total tagihan harus lebih besar dari Rp 0.',
    };
  }

  if (!selectedMemberIds || selectedMemberIds.length === 0) {
    return {
      isValid: false,
      totalAmount,
      participants: [],
      error: 'Pilih minimal satu anggota yang ikut dalam tagihan ini.',
    };
  }

  const count = selectedMemberIds.length;

  if (splitType === 'EQUAL_SPLIT' || splitType === 'SELECTED_SPLIT') {
    const baseShare = Math.floor(totalAmount / count);
    const remainder = totalAmount % count;

    const participants: SplitBillParticipant[] = selectedMemberIds.map((memberId, index) => {
      // Give remainder 1-by-1 to first participants so sum equals totalAmount exactly
      const amount = baseShare + (index < remainder ? 1 : 0);
      return {
        memberId,
        amount,
        isPaid: false,
      };
    });

    return {
      isValid: true,
      totalAmount,
      participants,
    };
  }

  if (splitType === 'EXACT_SPLIT') {
    let sum = 0;
    const participants: SplitBillParticipant[] = [];

    for (const memberId of selectedMemberIds) {
      const amt = Math.round(exactAmounts[memberId] || 0);
      if (amt < 0) {
        return {
          isValid: false,
          totalAmount,
          participants: [],
          error: 'Nominal per anggota tidak boleh negatif.',
        };
      }
      sum += amt;
      participants.push({
        memberId,
        amount: amt,
        isPaid: false,
      });
    }

    if (sum !== totalAmount) {
      const diff = totalAmount - sum;
      return {
        isValid: false,
        totalAmount,
        participants,
        error: `Total pembagian (Rp ${sum.toLocaleString('id-ID')}) tidak sama dengan total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}). Selisih: Rp ${diff.toLocaleString('id-ID')}`,
      };
    }

    return {
      isValid: true,
      totalAmount,
      participants,
    };
  }

  return {
    isValid: false,
    totalAmount,
    participants: [],
    error: 'Tipe pembagian tagihan tidak valid.',
  };
}
