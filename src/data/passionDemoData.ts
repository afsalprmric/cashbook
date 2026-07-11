import type { Transaction, Category, PaymentMode } from '../db/database';
import type { PassionGoal, FinancialSummary } from '../types/passion';
import { addMonths, format, subDays } from 'date-fns';

export interface DemoDataset {
  goal: PassionGoal;
  transactions: Transaction[];
  categories: Category[];
  paymentModes: PaymentMode[];
  summary: FinancialSummary;
}

export function getDemoData(): DemoDataset {
  const referenceDate = new Date();
  
  // Desired Date is 8 months from now
  const desiredDate = format(addMonths(referenceDate, 8), 'yyyy-MM-dd');
  
  // Set up categories matching seeded values
  const categories: Category[] = [
    { id: 'cat-salary', name: 'Salary', type: 'income', isDefault: true },
    { id: 'cat-food', name: 'Food & Dining', type: 'expense', isDefault: true },
    { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', isDefault: true },
    { id: 'cat-travel', name: 'Travel', type: 'expense', isDefault: true },
    { id: 'cat-shopping', name: 'Shopping', type: 'expense', isDefault: true },
    { id: 'cat-utilities', name: 'Mobile & Utilities', type: 'expense', isDefault: true }
  ];

  const paymentModes: PaymentMode[] = [
    { id: 'pm-upi', name: 'UPI', isDefault: true },
    { id: 'pm-cash', name: 'Cash', isDefault: true }
  ];

  // 1. Goal Mock
  const goal: PassionGoal = {
    id: 'demo-passion-goal',
    name: 'Build a home recording studio',
    description: 'A dedicated acoustically-treated space with professional gear to capture high-quality sound.',
    reason: 'Produce professional educational videos, courses, and music lessons.',
    targetAmount: 60000,
    currentSaved: 8000,
    desiredDate,
    isTargetFlexible: true,
    importance: 'very_important',
    flexibleCategoryIds: ['cat-food', 'cat-entertainment'], // Food & Dining + Entertainment flagged as flexible
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 2. Transactions Mock (90 days history: 3 full months)
  // Income: ₹45,000 monthly, Expense: ₹40,500 monthly, Surplus: ₹4,500 monthly.
  // We will distribute transactions over the last 90 days.
  const transactions: Transaction[] = [];

  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const baseDate = subDays(referenceDate, monthOffset * 30);
    const yyyymm = format(baseDate, 'yyyy-MM');

    // Income
    transactions.push({
      id: `t-inc-${monthOffset}`,
      type: 'income',
      amount: 45000,
      categoryId: 'cat-salary',
      date: `${yyyymm}-01`,
      paymentModeId: 'pm-upi',
      note: 'Monthly salary credit',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Expenses
    // Food delivery: ₹2,500 monthly
    transactions.push({
      id: `t-food-${monthOffset}-1`,
      type: 'expense',
      amount: 1500,
      categoryId: 'cat-food',
      date: `${yyyymm}-08`,
      paymentModeId: 'pm-upi',
      note: 'Online food delivery app',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    transactions.push({
      id: `t-food-${monthOffset}-2`,
      type: 'expense',
      amount: 1000,
      categoryId: 'cat-food',
      date: `${yyyymm}-22`,
      paymentModeId: 'pm-cash',
      note: 'Weekend dining out',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Subscriptions: ₹900 monthly
    transactions.push({
      id: `t-sub-${monthOffset}`,
      type: 'expense',
      amount: 900,
      categoryId: 'cat-entertainment',
      date: `${yyyymm}-10`,
      paymentModeId: 'pm-upi',
      note: 'Streaming subscriptions bundle',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Transport: ₹3,200 monthly
    transactions.push({
      id: `t-trans-${monthOffset}`,
      type: 'expense',
      amount: 3200,
      categoryId: 'cat-travel',
      date: `${yyyymm}-15`,
      paymentModeId: 'pm-upi',
      note: 'Commute fuel & ride charges',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Shopping: ₹2,000 monthly
    transactions.push({
      id: `t-shop-${monthOffset}`,
      type: 'expense',
      amount: 2000,
      categoryId: 'cat-shopping',
      date: `${yyyymm}-18`,
      paymentModeId: 'pm-upi',
      note: 'Clothing and gadgets purchases',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Utilities: ₹3,500 monthly
    transactions.push({
      id: `t-util-${monthOffset}`,
      type: 'expense',
      amount: 3500,
      categoryId: 'cat-utilities',
      date: `${yyyymm}-05`,
      paymentModeId: 'pm-upi',
      note: 'Electricity, broadband & mobile plans',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Other non-specified general expenses (total ₹28,400 monthly for other categories to sum to ₹40,500)
    // 40,500 - 2,500 - 900 - 3,200 - 2,000 - 3,500 = 28,400 remaining expenses
    transactions.push({
      id: `t-misc-${monthOffset}`,
      type: 'expense',
      amount: 28400,
      categoryId: 'cat-utilities',
      date: `${yyyymm}-25`,
      paymentModeId: 'pm-upi',
      note: 'Rent & Household groceries',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  // 3. Setup deterministic summary
  const topExpenseCategories = [
    { categoryId: 'cat-utilities', categoryName: 'Mobile & Utilities', total: 31900 * 3, monthlyAverage: 31900, transactionCount: 6 }, // Utilities + rent
    { categoryId: 'cat-travel', categoryName: 'Travel', total: 3200 * 3, monthlyAverage: 3200, transactionCount: 3 },
    { categoryId: 'cat-food', categoryName: 'Food & Dining', total: 2500 * 3, monthlyAverage: 2500, transactionCount: 6 },
    { categoryId: 'cat-shopping', categoryName: 'Shopping', total: 2000 * 3, monthlyAverage: 2000, transactionCount: 3 },
    { categoryId: 'cat-entertainment', categoryName: 'Entertainment', total: 900 * 3, monthlyAverage: 900, transactionCount: 3 }
  ];

  const selectedFlexibleCategories = [
    { categoryId: 'cat-food', categoryName: 'Food & Dining', total: 2500 * 3, monthlyAverage: 2500, transactionCount: 6 },
    { categoryId: 'cat-entertainment', categoryName: 'Entertainment', total: 900 * 3, monthlyAverage: 900, transactionCount: 3 }
  ];

  const summary: FinancialSummary = {
    analysisStartDate: format(subDays(referenceDate, 90), 'yyyy-MM-dd'),
    analysisEndDate: format(referenceDate, 'yyyy-MM-dd'),
    activeMonthCount: 3,
    averageMonthlyIncome: 45000,
    averageMonthlyExpense: 40500,
    averageMonthlySurplus: 4500,
    safeMonthlyContribution: 4500 * 0.80, // ₹3,600
    topExpenseCategories,
    selectedFlexibleCategories,
    availableTransactionCount: transactions.length
  };

  return {
    goal,
    transactions,
    categories,
    paymentModes,
    summary
  };
}
