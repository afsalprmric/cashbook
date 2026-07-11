export interface PassionGoal {
  id?: string;
  name: string;
  description: string;
  reason: string;
  targetAmount: number;
  currentSaved: number;
  desiredDate: string; // YYYY-MM-DD
  isTargetFlexible: boolean;
  importance: 'important' | 'very_important' | 'life_goal';
  flexibleCategoryIds: string[]; // references Category.id
  createdAt: number;
  updatedAt: number;
  latestPlan?: PassionPlan;
}

export type PassionFeasibility =
  | 'already_funded'
  | 'on_track'
  | 'challenging_but_possible'
  | 'currently_not_feasible';

export interface CategoryFinancialSummary {
  categoryId?: string;
  categoryName: string;
  total: number;
  monthlyAverage: number;
  transactionCount: number;
}

export interface FinancialSummary {
  analysisStartDate: string;
  analysisEndDate: string;
  activeMonthCount: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  averageMonthlySurplus: number;
  safeMonthlyContribution: number;
  topExpenseCategories: CategoryFinancialSummary[];
  selectedFlexibleCategories: CategoryFinancialSummary[];
  availableTransactionCount: number;
}

export interface PassionMetrics {
  remainingAmount: number;
  availableMonths: number;
  requiredMonthlyContribution: number;
  safeMonthlyContribution: number;
  simulatedMonthlyContribution: number;
  estimatedCompletionMonths: number | null;
  estimatedCompletionDate: string | null;
  fundingGapPerMonth: number;
  progressPercentage: number;
  feasibility: PassionFeasibility;
}

export interface PassionSuggestion {
  title: string;
  category: string;
  action: string;
  estimatedMonthlyImpact: number;
  reason: string;
}

export interface PassionMilestone {
  percentage: number;
  label: string;
  targetAmount: number;
  estimatedDate?: string;
}

export interface PassionPlan {
  feasibility: PassionFeasibility;
  headline: string;
  summary: string;
  suggestedMonthlyContribution: number;
  suggestions: PassionSuggestion[];
  milestones: PassionMilestone[];
  firstWeekActions: string[];
  encouragement: string;
  generatedAt: string;
  source: 'gemini' | 'local_fallback';
}
