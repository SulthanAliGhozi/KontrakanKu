import { AvailabilityPeriod, DutyLedgerEntry, Need, NeedCluster } from '../types';

export interface DutyBalanceRecord {
  memberId: string;
  assignedCount: number;
  executedCount: number;
  skippedCount: number;
  lastExecutedAt?: string;
  balanceScore: number; // executedCount minus assignedCount or simply executedCount
}

/**
 * calculateDutyBalances:
 * Aggregates duty ledger entries for a given need or across all needs.
 */
export function calculateDutyBalances(
  memberIds: string[],
  ledgerEntries: DutyLedgerEntry[],
  filterNeedId?: string
): Record<string, DutyBalanceRecord> {
  const result: Record<string, DutyBalanceRecord> = {};

  for (const id of memberIds) {
    result[id] = {
      memberId: id,
      assignedCount: 0,
      executedCount: 0,
      skippedCount: 0,
      balanceScore: 0,
    };
  }

  const entries = filterNeedId
    ? ledgerEntries.filter((e) => e.needId === filterNeedId)
    : ledgerEntries;

  // Sort chronological
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const entry of sorted) {
    if (!result[entry.memberId]) continue;
    const rec = result[entry.memberId];

    switch (entry.action) {
      case 'ASSIGN':
        rec.assignedCount += 1;
        break;
      case 'EXECUTE':
        rec.executedCount += 1;
        rec.lastExecutedAt = entry.createdAt;
        break;
      case 'SKIP':
        rec.skippedCount += 1;
        break;
      case 'TRANSFER':
        // If transferred to another member, transferToMemberId receives assignment
        if (entry.transferToMemberId && result[entry.transferToMemberId]) {
          result[entry.transferToMemberId].assignedCount += 1;
        }
        break;
      case 'REPLACE':
        rec.executedCount += 1;
        break;
    }
  }

  // Calculate balanceScore: higher executed count means they did more turns
  for (const id of memberIds) {
    result[id].balanceScore = result[id].executedCount;
  }

  return result;
}

/**
 * isMemberAvailable:
 * Checks whether a member is available on a specific target date
 * (not marked AWAY or BUSY in active availability periods).
 */
export function isMemberAvailable(
  memberId: string,
  targetDate: string,
  availabilityPeriods: AvailabilityPeriod[]
): boolean {
  const targetTime = new Date(targetDate).getTime();

  for (const p of availabilityPeriods) {
    if (p.memberId !== memberId) continue;
    if (p.status === 'ACTIVE') continue;

    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();

    // If target falls within start and end
    if (targetTime >= start && targetTime <= end) {
      return false; // Not available (AWAY or BUSY)
    }
  }

  return true;
}

/**
 * selectNextDutyMember:
 * Selects the next person responsible for a Need.
 * 
 * Rules:
 * 1. Filter by cluster if need has clusterId.
 * 2. Filter by availability (status != 'AWAY' and != 'BUSY').
 * 3. Strategy: Pick the member with the LOWEST executed duty count (lowest duty balance).
 * 4. Tie-breaker: Pick the member who executed least recently, or alphabetical/stable.
 */
export function selectNextDutyMember(
  need: Need,
  allHouseMemberIds: string[],
  clusters: NeedCluster[],
  availabilityPeriods: AvailabilityPeriod[],
  ledgerEntries: DutyLedgerEntry[],
  targetDate: string = new Date().toISOString()
): string | null {
  // Step 1: Filter by cluster
  let eligibleMemberIds = [...allHouseMemberIds];
  if (need.clusterId) {
    const cluster = clusters.find((c) => c.id === need.clusterId);
    if (cluster && cluster.memberIds.length > 0) {
      eligibleMemberIds = eligibleMemberIds.filter((id) => cluster.memberIds.includes(id));
    }
  }

  if (eligibleMemberIds.length === 0) {
    return null;
  }

  // Step 2: Filter by availability
  const availableMemberIds = eligibleMemberIds.filter((id) =>
    isMemberAvailable(id, targetDate, availabilityPeriods)
  );

  // Fallback to eligible members if all are marked away
  const candidateIds = availableMemberIds.length > 0 ? availableMemberIds : eligibleMemberIds;

  // Step 3: Duty balance scoring
  const balances = calculateDutyBalances(candidateIds, ledgerEntries, need.id);

  // Sort candidates by:
  // 1. lowest executed count (balanceScore)
  // 2. oldest lastExecutedAt (or never executed)
  candidateIds.sort((a, b) => {
    const balA = balances[a];
    const balB = balances[b];

    if (balA.balanceScore !== balB.balanceScore) {
      return balA.balanceScore - balB.balanceScore;
    }

    if (!balA.lastExecutedAt && balB.lastExecutedAt) return -1;
    if (balA.lastExecutedAt && !balB.lastExecutedAt) return 1;
    if (balA.lastExecutedAt && balB.lastExecutedAt) {
      return new Date(balA.lastExecutedAt).getTime() - new Date(balB.lastExecutedAt).getTime();
    }

    return a.localeCompare(b);
  });

  return candidateIds[0] || null;
}
