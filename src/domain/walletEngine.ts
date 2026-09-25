import { WalletTransaction } from '../types';

/**
 * calculateWalletBalance:
 * Derives current wallet balance from immutable transaction ledger.
 */
export function calculateWalletBalance(transactions: WalletTransaction[]): number {
  let balance = 0;

  // Sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const tx of sorted) {
    const amt = Math.round(tx.amount);
    switch (tx.type) {
      case 'INCOME':
        balance += amt;
        break;
      case 'EXPENSE':
      case 'REIMBURSEMENT':
        balance -= amt;
        break;
      case 'ADJUSTMENT':
        // Adjustment amount can be positive or negative depending on context
        balance += amt;
        break;
    }
  }

  return balance;
}
