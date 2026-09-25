import { calculateNetBalances, generateSettlementPlan } from '../netBalance';
import { calculateDutyBalances, selectNextDutyMember } from '../dutyEngine';
import { calculateConsumptionMetrics } from '../consumptionEngine';
import { validateQRISPayload, injectQRISAmount, calculateCRC16, createSampleQRISPayload } from '../qrisEngine';
import { calculateSplitBill } from '../splitBillValidator';
import { calculateWalletBalance } from '../walletEngine';
import { AvailabilityPeriod, DutyLedgerEntry, Need, NeedCluster, NeedPurchase, SplitBill, WalletTransaction } from '../../types';

export function runDomainUnitTests(): { passed: boolean; results: { name: string; success: boolean; message?: string }[] } {
  const results: { name: string; success: boolean; message?: string }[] = [];

  // Test 1: Net Balance & Settlement Plan
  try {
    const memberIds = ['user_1', 'user_2', 'user_3'];
    const splitBills: SplitBill[] = [
      {
        id: 'sb_1',
        houseId: 'house_1',
        creatorId: 'user_1',
        payerId: 'user_1',
        title: 'Makan Bersama',
        totalAmount: 90000,
        splitType: 'EQUAL_SPLIT',
        status: 'OPEN',
        createdAt: '2026-09-01T12:00:00Z',
        participants: [
          { memberId: 'user_1', amount: 30000, isPaid: true },
          { memberId: 'user_2', amount: 30000, isPaid: false },
          { memberId: 'user_3', amount: 30000, isPaid: false },
        ],
      },
    ];

    const balances = calculateNetBalances(memberIds, splitBills, []);
    const user1 = balances.find((b) => b.memberId === 'user_1')?.netAmount;
    const user2 = balances.find((b) => b.memberId === 'user_2')?.netAmount;
    const user3 = balances.find((b) => b.memberId === 'user_3')?.netAmount;

    if (user1 !== 60000 || user2 !== -30000 || user3 !== -30000) {
      throw new Error(`Net balance mismatch: user1=${user1}, user2=${user2}, user3=${user3}`);
    }

    const plan = generateSettlementPlan(balances);
    if (plan.length !== 2 || plan.reduce((a, b) => a + b.amount, 0) !== 60000) {
      throw new Error(`Settlement plan mismatch: expected 2 transfers totaling 60000, got ${plan.length}`);
    }

    results.push({ name: 'Net Balance & Settlement Plan Minimization', success: true });
  } catch (err: any) {
    results.push({ name: 'Net Balance & Settlement Plan Minimization', success: false, message: err.message });
  }

  // Test 2: Duty Selection with Availability & Ledger
  try {
    const need: Need = {
      id: 'need_galon',
      houseId: 'house_1',
      name: 'Galon Air',
      icon: 'droplets',
      category: 'GROCERIES',
      color: '#3b82f6',
      type: 'CONSUMABLE',
      dutyEnabled: true,
      averageConsumptionDays: 3,
      lastAmount: 18000,
      status: 'AVAILABLE',
    };

    const members = ['candra', 'sulthan', 'bima'];
    const ledger: DutyLedgerEntry[] = [
      { id: '1', needId: 'need_galon', houseId: 'house_1', memberId: 'candra', action: 'EXECUTE', createdAt: '2026-09-01T10:00:00Z' },
      { id: '2', needId: 'need_galon', houseId: 'house_1', memberId: 'bima', action: 'EXECUTE', createdAt: '2026-09-04T10:00:00Z' },
    ];
    // Sulthan has executed 0, Candra 1, Bima 1. Next should be sulthan!
    const next = selectNextDutyMember(need, members, [], [], ledger);
    if (next !== 'sulthan') {
      throw new Error(`Duty selection expected sulthan, got ${next}`);
    }

    // Now mark Sulthan as AWAY. Next should be Candra (executed earlier than Bima)
    const awayPeriods: AvailabilityPeriod[] = [
      {
        id: 'avail_1',
        houseId: 'house_1',
        memberId: 'sulthan',
        startDate: '2026-09-20T00:00:00Z',
        endDate: '2026-09-25T00:00:00Z',
        status: 'AWAY',
        createdAt: '2026-09-20T00:00:00Z',
      },
    ];
    const nextWithAway = selectNextDutyMember(need, members, [], awayPeriods, ledger, '2026-09-22T10:00:00Z');
    if (nextWithAway !== 'candra') {
      throw new Error(`Duty selection with Sulthan AWAY expected candra, got ${nextWithAway}`);
    }

    results.push({ name: 'Duty Rotation & Availability Exclusion', success: true });
  } catch (err: any) {
    results.push({ name: 'Duty Rotation & Availability Exclusion', success: false, message: err.message });
  }

  // Test 3: Consumption Prediction
  try {
    // Single purchase should return "Belum cukup data."
    const singlePurchase: NeedPurchase[] = [
      { id: 'p1', needId: 'n1', houseId: 'h1', purchaserId: 'u1', date: '2026-09-01', amount: 18000, quantity: 1, unit: 'galon' }
    ];
    const metricSingle = calculateConsumptionMetrics(singlePurchase);
    if (metricSingle.hasSufficientData !== false || metricSingle.displayText !== 'Belum cukup data.') {
      throw new Error('Consumption expected "Belum cukup data." for < 2 purchases');
    }

    // Multi purchases (intervals: 3 days, 3 days)
    const multiPurchases: NeedPurchase[] = [
      { id: 'p1', needId: 'n1', houseId: 'h1', purchaserId: 'u1', date: '2026-09-01', amount: 18000, quantity: 1, unit: 'galon' },
      { id: 'p2', needId: 'n1', houseId: 'h1', purchaserId: 'u2', date: '2026-09-04', amount: 18000, quantity: 1, unit: 'galon' },
      { id: 'p3', needId: 'n1', houseId: 'h1', purchaserId: 'u3', date: '2026-09-07', amount: 18000, quantity: 1, unit: 'galon' },
    ];
    const metricMulti = calculateConsumptionMetrics(multiPurchases);
    if (!metricMulti.hasSufficientData || metricMulti.averageIntervalDays !== 3) {
      throw new Error(`Consumption expected avg interval 3, got ${metricMulti.averageIntervalDays}`);
    }
    results.push({ name: 'Consumption Prediction & Insufficient Data Handling', success: true });
  } catch (err: any) {
    results.push({ name: 'Consumption Prediction & Insufficient Data Handling', success: false, message: err.message });
  }

  // Test 4: QRIS TLV & CRC16 CCITT
  try {
    const samplePayload = createSampleQRISPayload('KAS KONTRAKAN KITA');
    const parsed = validateQRISPayload(samplePayload);
    if (!parsed.isValid) {
      throw new Error(`Sample QRIS invalid: ${parsed.error}`);
    }

    // Inject 45.000 IDR
    const dynamicQRIS = injectQRISAmount(samplePayload, 45000);
    const parsedDynamic = validateQRISPayload(dynamicQRIS);
    if (!parsedDynamic.isValid) {
      throw new Error(`Dynamic QRIS invalid: ${parsedDynamic.error}`);
    }
    if (parsedDynamic.currentAmount !== 45000) {
      throw new Error(`Injected amount mismatch: expected 45000, got ${parsedDynamic.currentAmount}`);
    }
    if (!parsedDynamic.isDynamic) {
      throw new Error('Expected dynamic flag true after injection');
    }

    // Check CRC16 recalculation
    const payloadBody = dynamicQRIS.slice(0, -4);
    const expectedCRC = calculateCRC16(payloadBody);
    const actualCRC = dynamicQRIS.slice(-4);
    if (expectedCRC !== actualCRC) {
      throw new Error(`CRC16 mismatch: expected ${expectedCRC}, got ${actualCRC}`);
    }

    results.push({ name: 'QRIS EMVCo TLV Parsing, Injection & CRC16 Checksum', success: true });
  } catch (err: any) {
    results.push({ name: 'QRIS EMVCo TLV Parsing, Injection & CRC16 Checksum', success: false, message: err.message });
  }

  // Test 5: Split Bill Validator
  try {
    const equalRes = calculateSplitBill({
      totalAmount: 100000,
      splitType: 'EQUAL_SPLIT',
      payerId: 'u1',
      selectedMemberIds: ['u1', 'u2', 'u3'],
    });

    if (!equalRes.isValid || equalRes.participants.reduce((a, b) => a + b.amount, 0) !== 100000) {
      throw new Error('Equal split sum did not match totalAmount 100000');
    }

    const exactRes = calculateSplitBill({
      totalAmount: 50000,
      splitType: 'EXACT_SPLIT',
      payerId: 'u1',
      selectedMemberIds: ['u1', 'u2'],
      exactAmounts: { u1: 20000, u2: 30000 },
    });
    if (!exactRes.isValid) {
      throw new Error(`Exact split failed: ${exactRes.error}`);
    }

    results.push({ name: 'Split Bill Validation (Equal & Exact Split Math)', success: true });
  } catch (err: any) {
    results.push({ name: 'Split Bill Validation (Equal & Exact Split Math)', success: false, message: err.message });
  }

  // Test 6: Wallet Balance from Ledger
  try {
    const txs: WalletTransaction[] = [
      { id: '1', walletId: 'w1', houseId: 'h1', actorId: 'u1', type: 'INCOME', amount: 500000, description: 'Iuran', category: 'CONTRIBUTION', createdAt: '2026-09-01' },
      { id: '2', walletId: 'w1', houseId: 'h1', actorId: 'u2', type: 'EXPENSE', amount: 80000, description: 'Sapu & Pel', category: 'HOUSEHOLD', createdAt: '2026-09-03' },
      { id: '3', walletId: 'w1', houseId: 'h1', actorId: 'u3', type: 'REIMBURSEMENT', amount: 50000, description: 'Ganti Kran Rusak', category: 'MAINTENANCE', createdAt: '2026-09-05' },
    ];
    const bal = calculateWalletBalance(txs);
    if (bal !== 370000) {
      throw new Error(`Wallet balance expected 370000, got ${bal}`);
    }
    results.push({ name: 'House Wallet Immutable Ledger Derivation', success: true });
  } catch (err: any) {
    results.push({ name: 'House Wallet Immutable Ledger Derivation', success: false, message: err.message });
  }

  const allPassed = results.every((r) => r.success);
  return { passed: allPassed, results };
}
