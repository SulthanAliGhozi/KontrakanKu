import { NeedPurchase } from '../types';

export interface ConsumptionMetrics {
  hasSufficientData: boolean;
  purchaseCount: number;
  averageIntervalDays: number | null;
  medianIntervalDays: number | null;
  averageCost: number | null;
  totalSpent: number;
  frequencyPerMonth: number | null;
  trend: 'ACCELERATING' | 'STEADY' | 'SLOWING' | 'INSUFFICIENT_DATA';
  estimatedNextPurchaseDate: string | null;
  estimatedNextDateRange: { from: string; to: string } | null;
  displayText: string;
}

/**
 * calculateConsumptionMetrics:
 * Analyzes historical purchases for a single Need.
 */
export function calculateConsumptionMetrics(
  purchases: NeedPurchase[]
): ConsumptionMetrics {
  // Filter and sort purchases chronologically (oldest to newest)
  const validPurchases = purchases
    .filter((p) => p.date && !isNaN(new Date(p.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const count = validPurchases.length;
  const totalSpent = validPurchases.reduce((acc, p) => acc + (p.amount || 0), 0);

  if (count < 2) {
    return {
      hasSufficientData: false,
      purchaseCount: count,
      averageIntervalDays: null,
      medianIntervalDays: null,
      averageCost: count === 1 ? validPurchases[0].amount : null,
      totalSpent,
      frequencyPerMonth: null,
      trend: 'INSUFFICIENT_DATA',
      estimatedNextPurchaseDate: null,
      estimatedNextDateRange: null,
      displayText: 'Belum cukup data.',
    };
  }

  // Calculate intervals between consecutive purchases in days
  const intervals: number[] = [];
  for (let i = 1; i < count; i++) {
    const prevDate = new Date(validPurchases[i - 1].date).getTime();
    const currDate = new Date(validPurchases[i].date).getTime();
    const diffDays = Math.max(0.5, (currDate - prevDate) / (1000 * 60 * 60 * 24));
    intervals.push(diffDays);
  }

  const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;

  // Median interval
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const mid = Math.floor(sortedIntervals.length / 2);
  const medianInterval =
    sortedIntervals.length % 2 !== 0
      ? sortedIntervals[mid]
      : (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2;

  const avgCost = Math.round(totalSpent / count);
  const frequencyPerMonth = Number((30 / avgInterval).toFixed(1));

  // Determine trend by comparing recent interval vs older interval
  let trend: 'ACCELERATING' | 'STEADY' | 'SLOWING' = 'STEADY';
  if (intervals.length >= 3) {
    const recentInterval = intervals[intervals.length - 1];
    const olderAvg = intervals.slice(0, -1).reduce((a, b) => a + b, 0) / (intervals.length - 1);

    if (recentInterval < olderAvg * 0.8) {
      trend = 'ACCELERATING'; // Purchases happening faster/more frequently
    } else if (recentInterval > olderAvg * 1.25) {
      trend = 'SLOWING'; // Purchases happening slower
    }
  }

  // Conservative Next Purchase Prediction
  // Base on the last purchase date + average interval
  const lastPurchase = validPurchases[validPurchases.length - 1];
  const lastPurchaseDate = new Date(lastPurchase.date);

  // Use a weighted interval favoring recent interval
  const predictionIntervalDays = intervals.length > 2
    ? (avgInterval * 0.5 + intervals[intervals.length - 1] * 0.5)
    : avgInterval;

  const estimatedDate = new Date(lastPurchaseDate);
  estimatedDate.setDate(estimatedDate.getDate() + Math.round(predictionIntervalDays));

  // Date range: [estimatedDate - 1 day, estimatedDate + 1 day]
  const fromDate = new Date(estimatedDate);
  fromDate.setDate(fromDate.getDate() - 1);
  const toDate = new Date(estimatedDate);
  toDate.setDate(toDate.getDate() + 1);

  const roundedAvgDays = Number(avgInterval.toFixed(1));

  return {
    hasSufficientData: true,
    purchaseCount: count,
    averageIntervalDays: roundedAvgDays,
    medianIntervalDays: Number(medianInterval.toFixed(1)),
    averageCost: avgCost,
    totalSpent,
    frequencyPerMonth,
    trend,
    estimatedNextPurchaseDate: estimatedDate.toISOString().split('T')[0],
    estimatedNextDateRange: {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
    },
    displayText: `Setiap ~${roundedAvgDays} hari (Estimasi: ${estimatedDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    })})`,
  };
}
