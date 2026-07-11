import { differenceInCalendarMonths, parseISO, isWithinInterval, subDays, addMonths, format } from 'date-fns';
import type { Transaction, Category, PaymentMode } from '../db/database';
import type {
  FinancialSummary,
  PassionMetrics,
  PassionGoal,
  PassionPlan,
  PassionFeasibility,
  CategoryFinancialSummary,
  PassionMilestone,
  PassionSuggestion
} from '../types/passion';

export const SURPLUS_SAFETY_BUFFER = 0.80; // 80% of surplus is safe to contribute

/**
 * Analyses financial transaction history for the most recent 90 days.
 */
export function analyseFinancialHistory(
  transactions: Transaction[],
  categories: Category[],
  _paymentModes: PaymentMode[],
  referenceDateInput?: Date
): FinancialSummary {
  const referenceDate = referenceDateInput || new Date();
  const startDate = subDays(referenceDate, 90);

  // Filter transactions within the last 90 days
  const filtered = transactions.filter(t => {
    try {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start: startDate, end: referenceDate });
    } catch {
      return false; // Skip invalid dates safely
    }
  });

  // Calculate unique months represented in the dataset
  const uniqueMonths = new Set<string>();
  filtered.forEach(t => {
    uniqueMonths.add(t.date.substring(0, 7)); // 'YYYY-MM'
  });

  const activeMonthCount = Math.max(1, uniqueMonths.size);

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, { total: number; count: number }> = {};

  filtered.forEach(t => {
    const amount = Number(t.amount);
    if (isNaN(amount) || amount <= 0) return;

    if (t.type === 'income') {
      totalIncome += amount;
    } else if (t.type === 'expense') {
      totalExpense += amount;
      if (!categoryTotals[t.categoryId]) {
        categoryTotals[t.categoryId] = { total: 0, count: 0 };
      }
      categoryTotals[t.categoryId].total += amount;
      categoryTotals[t.categoryId].count += 1;
    }
  });

  // Map category IDs to names
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  const topExpenseCategories: CategoryFinancialSummary[] = Object.keys(categoryTotals).map(catId => {
    const total = categoryTotals[catId].total;
    return {
      categoryId: catId,
      categoryName: categoryMap.get(catId) || 'Uncategorized',
      total,
      monthlyAverage: total / activeMonthCount,
      transactionCount: categoryTotals[catId].count
    };
  }).sort((a, b) => b.monthlyAverage - a.monthlyAverage);

  const averageMonthlyIncome = totalIncome / activeMonthCount;
  const averageMonthlyExpense = totalExpense / activeMonthCount;
  const averageMonthlySurplus = averageMonthlyIncome - averageMonthlyExpense;
  const safeMonthlyContribution = Math.max(0, averageMonthlySurplus * SURPLUS_SAFETY_BUFFER);

  return {
    analysisStartDate: format(startDate, 'yyyy-MM-dd'),
    analysisEndDate: format(referenceDate, 'yyyy-MM-dd'),
    activeMonthCount,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlySurplus,
    safeMonthlyContribution,
    topExpenseCategories,
    selectedFlexibleCategories: [], // to be populated based on goal settings later
    availableTransactionCount: filtered.length
  };
}

/**
 * Calculates deterministic passion goal metrics.
 */
export function calculatePassionMetrics(
  goal: PassionGoal,
  summary: FinancialSummary,
  simulatedReduction: number = 0,
  simulatedAdditionalIncome: number = 0,
  customPeriod?: number,
  referenceDateInput?: Date
): PassionMetrics {
  const referenceDate = referenceDateInput || new Date();
  const target = Math.max(1, goal.targetAmount);
  const saved = Math.max(0, goal.currentSaved);
  const remainingAmount = Math.max(0, target - saved);

  // Available months calculation
  let availableMonths = 1;
  try {
    const targetDate = parseISO(goal.desiredDate);
    const months = differenceInCalendarMonths(targetDate, referenceDate);
    availableMonths = Math.max(1, months);
  } catch {
    availableMonths = 1;
  }

  // Override available months if customPeriod is provided by simulator
  const activePeriod = customPeriod !== undefined && customPeriod > 0 ? customPeriod : availableMonths;

  const requiredMonthlyContribution = remainingAmount / activePeriod;

  // Simulated metrics
  const safeMonthlyContribution = summary.safeMonthlyContribution;
  const simulatedMonthlyContribution = Math.max(0, safeMonthlyContribution + simulatedReduction + simulatedAdditionalIncome);

  let estimatedCompletionMonths: number | null = null;
  let estimatedCompletionDate: string | null = null;

  if (simulatedMonthlyContribution > 0) {
    estimatedCompletionMonths = Math.ceil(remainingAmount / simulatedMonthlyContribution);
    estimatedCompletionDate = format(addMonths(referenceDate, estimatedCompletionMonths), 'yyyy-MM-dd');
  }

  const fundingGapPerMonth = Math.max(0, requiredMonthlyContribution - simulatedMonthlyContribution);
  const progressPercentage = Math.min(100, Math.max(0, (saved / target) * 100));

  // Determine feasibility
  let feasibility: PassionFeasibility = 'currently_not_feasible';
  if (remainingAmount === 0) {
    feasibility = 'already_funded';
  } else if (simulatedMonthlyContribution === 0) {
    feasibility = 'currently_not_feasible';
  } else if (simulatedMonthlyContribution >= requiredMonthlyContribution) {
    feasibility = 'on_track';
  } else {
    feasibility = 'challenging_but_possible';
  }

  return {
    remainingAmount,
    availableMonths: activePeriod,
    requiredMonthlyContribution,
    safeMonthlyContribution,
    simulatedMonthlyContribution,
    estimatedCompletionMonths,
    estimatedCompletionDate,
    fundingGapPerMonth,
    progressPercentage,
    feasibility
  };
}

/**
 * Builds chronological milestones (25%, 50%, 75%, 100%) for visual tracking.
 */
export function buildMilestones(
  goal: PassionGoal,
  simulatedMonthlyContribution: number,
  referenceDateInput?: Date
): PassionMilestone[] {
  const referenceDate = referenceDateInput || new Date();
  const target = goal.targetAmount;
  const saved = goal.currentSaved;

  const milestonesPercentages = [25, 50, 75, 100];
  return milestonesPercentages.map(pct => {
    const milestoneTarget = (target * pct) / 100;
    const additionalNeeded = Math.max(0, milestoneTarget - saved);

    let estimatedDate: string | undefined = undefined;
    if (additionalNeeded === 0) {
      estimatedDate = 'Already Funded';
    } else if (simulatedMonthlyContribution > 0) {
      const monthsNeeded = Math.ceil(additionalNeeded / simulatedMonthlyContribution);
      estimatedDate = format(addMonths(referenceDate, monthsNeeded), 'yyyy-MM');
    } else {
      estimatedDate = 'TBD';
    }

    return {
      percentage: pct,
      label: `${pct}% Funded`,
      targetAmount: milestoneTarget,
      estimatedDate
    };
  });
}

/**
 * Generates local fallback plan in case Gemini API is offline/unavailable.
 */
export function generateLocalFallbackPlan(
  goal: PassionGoal,
  metrics: PassionMetrics,
  summary: FinancialSummary
): PassionPlan {
  const milestones = buildMilestones(goal, metrics.simulatedMonthlyContribution);

  const fallbackSuggestions: PassionSuggestion[] = [
    {
      title: 'Optimize Subscription Spend',
      category: 'Utilities/Sub',
      action: 'Audit active digital plans and downgrade unused or redundant streaming/software licenses.',
      estimatedMonthlyImpact: 500,
      reason: 'Helps narrow the gap safely without impacting core needs.'
    },
    {
      title: 'Reduce Direct Dining/Delivery',
      category: 'Food & Dining',
      action: 'Shift 2 meals per week from commercial ordering/delivery to meal prepping.',
      estimatedMonthlyImpact: 1500,
      reason: 'Food delivery is typically the easiest flexible category to adjust.'
    }
  ];

  // Include user flexible category references if they selected any
  if (goal.flexibleCategoryIds.length > 0 && summary.topExpenseCategories.length > 0) {
    const categoryMap = new Map<string, number>();
    summary.topExpenseCategories.forEach(c => categoryMap.set(c.categoryId as string, c.monthlyAverage));
    
    // Find the largest user-flagged flexible category
    const userFlex = summary.topExpenseCategories.find(c => goal.flexibleCategoryIds.includes(c.categoryId as string));
    if (userFlex) {
      fallbackSuggestions.push({
        title: `Optimize ${userFlex.categoryName} spending`,
        category: userFlex.categoryName,
        action: `Try to adjust discretionary purchases in the ${userFlex.categoryName} category by 10-15%.`,
        estimatedMonthlyImpact: Math.round(userFlex.monthlyAverage * 0.15),
        reason: 'Adjusting flexible lifestyle costs can dramatically pull the timeline closer.'
      });
    }
  }

  const headline = `A Practical Journey to fund your dream: ${goal.name}`;
  const summaryText = `To fund your target of ${formatCurrency(goal.targetAmount)} by ${goal.desiredDate}, you have already saved ${formatCurrency(goal.currentSaved)}. This local plan maps out how your simulated monthly allocation of ${formatCurrency(metrics.simulatedMonthlyContribution)} can satisfy this target in approximately ${metrics.estimatedCompletionMonths || 'TBD'} months.`;

  return {
    feasibility: metrics.feasibility,
    headline,
    summary: summaryText,
    suggestedMonthlyContribution: Math.round(metrics.requiredMonthlyContribution),
    suggestions: fallbackSuggestions,
    milestones,
    firstWeekActions: [
      `Lock in your target savings rate of ${formatCurrency(metrics.simulatedMonthlyContribution)} to separate interest/savings channels.`,
      `Set a recurring monthly reminder on statement days to verify category totals.`,
      `Review your Cashflow categories to identify minor discretionary items.`
    ],
    encouragement: `Your dream of "${goal.name}" (to "${goal.reason}") is completely possible. Focus on small steps each day!`,
    generatedAt: new Date().toISOString(),
    source: 'local_fallback'
  };
}

/**
 * Formats a number as INR (or standard currency format).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}
