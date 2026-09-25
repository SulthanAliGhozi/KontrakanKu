import { NetBalancePosition, SettlementPlanItem, SplitBill, Settlement } from '../types';

/**
 * calculateNetBalances:
 * Aggregates all unsettled split bill debts and settlements.
 * 
 * Logic:
 * For each SplitBill:
 * - The payer paid totalAmount.
 * - Each participant owes participant.amount.
 * - If participant != payer and isPaid is false:
 *     payer net balance increases by participant.amount (they are owed this)
 *     participant net balance decreases by participant.amount (they owe this)
 * 
 * For confirmed or submitted settlements:
 * - If confirmed, the debtor paid creditor, so:
 *     debtor net balance increases by amount (debt cleared)
 *     creditor net balance decreases by amount (credit received)
 */
export function calculateNetBalances(
  allMemberIds: string[],
  splitBills: SplitBill[],
  settlements: Settlement[] = []
): NetBalancePosition[] {
  const balanceMap: Record<string, number> = {};

  for (const id of allMemberIds) {
    balanceMap[id] = 0;
  }

  // 1. Process Split Bills
  for (const bill of splitBills) {
    if (bill.status === 'SETTLED') continue;

    const payerId = bill.payerId;
    for (const p of bill.participants) {
      if (p.memberId === payerId) continue; // payer owes himself nothing
      if (p.isPaid) continue; // already marked as paid separately

      const amt = Math.round(p.amount);
      balanceMap[payerId] = (balanceMap[payerId] || 0) + amt;
      balanceMap[p.memberId] = (balanceMap[p.memberId] || 0) - amt;
    }
  }

  // 2. Process Settlements (only CONFIRMED or PAYMENT_SUBMITTED)
  for (const s of settlements) {
    if (s.status === 'CONFIRMED') {
      const amt = Math.round(s.amount);
      // debtor paid, so debtor's negative balance is alleviated (+amt)
      balanceMap[s.debtorId] = (balanceMap[s.debtorId] || 0) + amt;
      // creditor received money, so their credit is reduced (-amt)
      balanceMap[s.creditorId] = (balanceMap[s.creditorId] || 0) - amt;
    }
  }

  return allMemberIds.map((memberId) => ({
    memberId,
    netAmount: balanceMap[memberId] || 0,
  }));
}

/**
 * generateSettlementPlan:
 * Minimizes unnecessary transactions among members using a greedy matching algorithm.
 * 
 * Takes net positions:
 * Debtors (netAmount < 0)
 * Creditors (netAmount > 0)
 * Greedily settles the largest debtor with the largest creditor until all balances reach 0.
 */
export function generateSettlementPlan(netPositions: NetBalancePosition[]): SettlementPlanItem[] {
  // Separate into debtors and creditors
  // Store amounts as absolute positive integers
  const debtors: { memberId: string; remaining: number }[] = [];
  const creditors: { memberId: string; remaining: number }[] = [];

  for (const pos of netPositions) {
    const rounded = Math.round(pos.netAmount);
    if (rounded < 0) {
      debtors.push({ memberId: pos.memberId, remaining: Math.abs(rounded) });
    } else if (rounded > 0) {
      creditors.push({ memberId: pos.memberId, remaining: rounded });
    }
  }

  // Sort descending by remaining amount
  debtors.sort((a, b) => b.remaining - a.remaining);
  creditors.sort((a, b) => b.remaining - a.remaining);

  const plan: SettlementPlanItem[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.remaining, creditor.remaining);

    if (settleAmount > 0) {
      plan.push({
        debtorId: debtor.memberId,
        creditorId: creditor.memberId,
        amount: settleAmount,
      });

      debtor.remaining -= settleAmount;
      creditor.remaining -= settleAmount;
    }

    if (debtor.remaining <= 0) dIdx++;
    if (creditor.remaining <= 0) cIdx++;
  }

  return plan;
}
