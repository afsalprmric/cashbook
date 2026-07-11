import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { format } from 'date-fns';
import type { PassionGoal as IPassionGoal, FinancialSummary, PassionMetrics, PassionPlan } from '../types/passion';
import { 
  analyseFinancialHistory, 
  calculatePassionMetrics, 
  generateLocalFallbackPlan 
} from '../services/financeCalculator';
import { getDemoData } from '../data/passionDemoData';
import { downloadPassionPlanPDF } from '../services/passionPdf';

// UI components
import PassionHero from '../components/passion/PassionHero';
import PassionGoalForm from '../components/passion/PassionGoalForm';
import PassionProgress from '../components/passion/PassionProgress';
import PassionMetricsGrid from '../components/passion/PassionMetricsGrid';
import PassionRunwayChart from '../components/passion/PassionRunwayChart';
import WhatIfSimulator from '../components/passion/WhatIfSimulator';
import PassionAIPlan from '../components/passion/PassionAIPlan';
import PassionPrivacy from '../components/passion/PassionPrivacy';
import DemoBadge from '../components/passion/DemoBadge';

// Styling
import './PassionGoal.css';
import { FiEdit2, FiTrash2, FiDollarSign } from 'react-icons/fi';

const PassionGoalPage: React.FC = () => {
  // App States
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isManualSummaryMode, setIsManualSummaryMode] = useState(false);

  // Manual values if no transaction history exists
  const [manualIncome, setManualIncome] = useState<string>('');
  const [manualExpense, setManualExpense] = useState<string>('');
  const [manualSavings, setManualSavings] = useState<string>('');

  // What-if simulator states
  const [simulatedReduction, setSimulatedReduction] = useState(0);
  const [simulatedAdditionalIncome, setSimulatedAdditionalIncome] = useState(0);
  const [simulatedPeriod, setSimulatedPeriod] = useState<number | undefined>(undefined);

  // AI Plan states
  const [aiPlan, setAiPlan] = useState<PassionPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const pingOnline = () => setIsOnline(true);
    const pingOffline = () => setIsOnline(false);
    window.addEventListener('online', pingOnline);
    window.addEventListener('offline', pingOffline);
    return () => {
      window.removeEventListener('online', pingOnline);
      window.removeEventListener('offline', pingOffline);
    };
  }, []);

  // Database Queries
  const realGoal = useLiveQuery(() => db.passionGoals.toArray().then(arr => arr[0] || null));
  const realTransactions = useLiveQuery(() => db.transactions.toArray());
  const realCategories = useLiveQuery(() => db.categories.toArray());
  const realPaymentModes = useLiveQuery(() => db.paymentModes.toArray());

  // Determine active datasets based on Mode
  const demoDataset = useMemo(() => (isDemoMode ? getDemoData() : null), [isDemoMode]);

  const activeGoal = useMemo(() => {
    if (isDemoMode) return demoDataset?.goal || null;
    return realGoal;
  }, [isDemoMode, demoDataset, realGoal]);

  const activeTransactions = useMemo(() => {
    if (isDemoMode) return demoDataset?.transactions || [];
    return realTransactions || [];
  }, [isDemoMode, demoDataset, realTransactions]);

  const activeCategories = useMemo(() => {
    if (isDemoMode) return demoDataset?.categories || [];
    return realCategories || [];
  }, [isDemoMode, demoDataset, realCategories]);

  const activePaymentModes = useMemo(() => {
    if (isDemoMode) return demoDataset?.paymentModes || [];
    return realPaymentModes || [];
  }, [isDemoMode, demoDataset, realPaymentModes]);

  // Derived Financial Summary
  const financialSummary = useMemo((): FinancialSummary | null => {
    if (isDemoMode && demoDataset) {
      return demoDataset.summary;
    }

    if (!activeCategories.length) return null;

    // Handle manual inputs if user explicitly configures it or there are no transactions
    if (isManualSummaryMode || activeTransactions.length === 0) {
      const income = Number(manualIncome) || 0;
      const expense = Number(manualExpense) || 0;
      const surplus = income - expense;
      const safe = Math.max(0, surplus * 0.80);

      return {
        analysisStartDate: format(new Date(), 'yyyy-MM-dd'),
        analysisEndDate: format(new Date(), 'yyyy-MM-dd'),
        activeMonthCount: 1,
        averageMonthlyIncome: income,
        averageMonthlyExpense: expense,
        averageMonthlySurplus: surplus,
        safeMonthlyContribution: safe,
        topExpenseCategories: [],
        selectedFlexibleCategories: [],
        availableTransactionCount: 0
      };
    }

    // Default: Analyse real transactions
    const referenceDate = activeTransactions.length > 0
      ? new Date(Math.max(...activeTransactions.map(t => new Date(t.date).getTime())))
      : new Date();

    const history = analyseFinancialHistory(
      activeTransactions,
      activeCategories,
      activePaymentModes,
      referenceDate
    );

    // Resolve flexible categories matching goal selections
    if (activeGoal) {
      history.selectedFlexibleCategories = history.topExpenseCategories.filter(cat =>
        activeGoal.flexibleCategoryIds.includes(cat.categoryId as string)
      );
    }

    return history;

  }, [
    isDemoMode, 
    demoDataset, 
    activeTransactions, 
    activeCategories, 
    activePaymentModes, 
    activeGoal, 
    isManualSummaryMode, 
    manualIncome, 
    manualExpense
  ]);

  // Sync simulator sliders with goal defaults on load
  useEffect(() => {
    if (activeGoal) {
      setSimulatedReduction(0);
      setSimulatedAdditionalIncome(0);
      setSimulatedPeriod(undefined);
      setAiPlan(activeGoal.latestPlan || null);
    } else {
      setAiPlan(null);
    }
  }, [activeGoal]);

  // Calculated Metrics
  const metrics = useMemo((): PassionMetrics | null => {
    if (!activeGoal || !financialSummary) return null;

    // Use simulated period from state, fallback to calculated months
    const refDate = isDemoMode ? new Date() : undefined;
    return calculatePassionMetrics(
      activeGoal,
      financialSummary,
      simulatedReduction,
      simulatedAdditionalIncome,
      simulatedPeriod,
      refDate
    );
  }, [activeGoal, financialSummary, simulatedReduction, simulatedAdditionalIncome, simulatedPeriod, isDemoMode]);

  // Reset simulator values
  const handleResetSimulator = () => {
    setSimulatedReduction(0);
    setSimulatedAdditionalIncome(0);
    setSimulatedPeriod(undefined);
  };

  // CRUD handlers
  const handleSaveGoal = async (formGoal: Omit<IPassionGoal, 'createdAt' | 'updatedAt'>) => {
    if (isDemoMode) {
      alert('Cannot save changes in Demo Mode.');
      return;
    }

    const payload: IPassionGoal = {
      ...formGoal,
      id: formGoal.id || crypto.randomUUID(),
      createdAt: activeGoal?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await db.passionGoals.put(payload);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleDeleteGoal = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      return;
    }

    if (window.confirm('Are you sure you want to delete your current passion plan goal? This action is non-reversible.')) {
      if (activeGoal?.id) {
        await db.passionGoals.delete(activeGoal.id);
      }
      handleResetSimulator();
      setAiPlan(null);
    }
  };

  // Trigger AI generation
  const handleGenerateAIPlan = async () => {
    if (!activeGoal || !financialSummary || !metrics) return;

    setAiLoading(true);

    // Build package content securely - exclude raw transaction arrays/notes/phone numbers
    const payload = {
      goal: {
        name: activeGoal.name,
        description: activeGoal.description,
        reason: activeGoal.reason,
        targetAmount: activeGoal.targetAmount,
        currentSaved: activeGoal.currentSaved,
        desiredMonths: metrics.availableMonths,
        isTargetFlexible: activeGoal.isTargetFlexible
      },
      financialSummary: {
        averageMonthlyIncome: financialSummary.averageMonthlyIncome,
        averageMonthlyExpense: financialSummary.averageMonthlyExpense,
        averageMonthlySurplus: financialSummary.averageMonthlySurplus,
        safeMonthlyContribution: financialSummary.safeMonthlyContribution,
        topExpenseCategories: financialSummary.topExpenseCategories.slice(0, 5).map(c => ({
          categoryName: c.categoryName,
          monthlyAverage: c.monthlyAverage
        })),
        selectedFlexibleCategories: financialSummary.selectedFlexibleCategories.map(c => ({
          categoryName: c.categoryName,
          monthlyAverage: c.monthlyAverage
        }))
      },
      verifiedMetrics: {
        remainingAmount: metrics.remainingAmount,
        availableMonths: metrics.availableMonths,
        requiredMonthlyContribution: metrics.requiredMonthlyContribution,
        simulatedMonthlyContribution: metrics.simulatedMonthlyContribution,
        fundingGapPerMonth: metrics.fundingGapPerMonth,
        estimatedCompletionMonths: metrics.estimatedCompletionMonths,
        feasibility: metrics.feasibility
      }
    };

    // If offline, bypass network call immediately
    if (!isOnline) {
      setTimeout(() => {
        const fallback = generateLocalFallbackPlan(activeGoal, metrics, financialSummary);
        setAiPlan(fallback);
        setAiLoading(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch('/api/generate-passion-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const rawPlan = await response.json();
      
      // Save generating source locally if real goal exists
      if (!isDemoMode && realGoal) {
        await db.passionGoals.update(realGoal.id!, {
          latestPlan: rawPlan,
          updatedAt: Date.now()
        });
      }

      setAiPlan(rawPlan);
    } catch (err) {
      console.warn('API Error, switching to local fallback:', err);
      // Trigger fallback
      const fallback = generateLocalFallbackPlan(activeGoal, metrics, financialSummary);
      setAiPlan(fallback);
    } finally {
      setAiLoading(false);
    }
  };

  // PDF Export Trigger
  const handleDownloadPDF = () => {
    if (!activeGoal || !metrics || !aiPlan) return;
    downloadPassionPlanPDF(activeGoal, metrics, aiPlan);
  };

  return (
    <div className="passion-page-container">
      {/* 1. Badge warning if running Demo */}
      {isDemoMode && (
        <DemoBadge onExit={() => setIsDemoMode(false)} />
      )}

      {/* 2. Hero Landing State (No active goal, not creating, and not in demo) */}
      {!activeGoal && !isEditing && !isCreatingNew && !isManualSummaryMode && (
        <PassionHero 
          onCreateGoal={() => setIsCreatingNew(true)} 
          onStartDemo={() => setIsDemoMode(true)} 
        />
      )}

      {/* 3. Empty Transactions Prompt / Manual Summary Selection */}
      {!activeGoal && isCreatingNew && !isDemoMode && activeTransactions.length === 0 && !isManualSummaryMode && (
        <div className="glass-panel text-center py-4 mb-4 animate-fade-in">
          <div style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }}>
            <FiDollarSign className="pulse-animation" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Your Cashbook is Empty</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
            To analyze your savings curve, PassionLedger needs transaction averages. You can either feed sample summaries manually or load demo configurations.
          </p>
          <div className="d-flex justify-center gap-2 flex-wrap">
            <button 
              onClick={() => setIsManualSummaryMode(true)}
              className="btn-primary"
              style={{ padding: '0.6rem 1.2rem' }}
            >
              Enter Simple Monthly Summary
            </button>
            <button 
              onClick={() => setIsDemoMode(true)}
              className="btn-secondary"
              style={{ padding: '0.6rem 1.2rem' }}
            >
              Use Demo Data instead
            </button>
          </div>
        </div>
      )}

      {/* 4. Manual Summary Input Form */}
      {isManualSummaryMode && !activeGoal && (
        <div className="glass-panel animate-fade-in p-4 mb-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 className="gradient-text mb-3">Provide Monthly Summary</h3>
          <div className="form-group mb-3">
            <label className="form-label">Average Monthly Income (INR)</label>
            <input 
              type="number"
              className="form-control"
              value={manualIncome}
              onChange={e => setManualIncome(e.target.value)}
              placeholder="e.g. 45000"
            />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Average Monthly Expenses (INR)</label>
            <input 
              type="number"
              className="form-control"
              value={manualExpense}
              onChange={e => setManualExpense(e.target.value)}
              placeholder="e.g. 40500"
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Current Goal Savings (INR)</label>
            <input 
              type="number"
              className="form-control"
              value={manualSavings}
              onChange={e => setManualSavings(e.target.value)}
              placeholder="e.g. 8000"
            />
          </div>
          <div className="d-flex justify-end gap-2">
            <button 
              onClick={() => {
                setIsManualSummaryMode(false);
                setIsCreatingNew(false);
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (!manualIncome || !manualExpense) {
                  alert('Income and Expenses are required.');
                  return;
                }
                // Transition directly to the goal form with manual summary active
                setIsCreatingNew(true);
                setIsManualSummaryMode(false);
              }} 
              className="btn-primary"
            >
              Next: Define Goal
            </button>
          </div>
        </div>
      )}

      {/* 5. Creating / Editing Goal Form */}
      {(isCreatingNew || isEditing) && (
        <PassionGoalForm 
          categories={activeCategories}
          initialGoal={isEditing ? activeGoal : null}
          onSave={handleSaveGoal}
          onCancel={() => {
            setIsEditing(false);
            setIsCreatingNew(false);
          }}
        />
      )}

      {/* 6. Active Dashboard State */}
      {activeGoal && !isEditing && !isCreatingNew && financialSummary && metrics && (
        <div className="passion-dashboard-grid animate-fade-in">
          {/* Header Action controls */}
          <div className="glass-panel d-flex justify-between align-center mb-4 flex-wrap gap-2" style={{ padding: '1rem 1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Passion Goals Center</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Comparing deterministic formulas with interactive what-if parameters
              </span>
            </div>
            <div className="d-flex gap-2">
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn-secondary d-flex align-center gap-1"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <FiEdit2 size={14} />
                <span>Edit Goal</span>
              </button>
              <button 
                onClick={handleDeleteGoal} 
                className="btn-secondary btn-danger d-flex align-center gap-1"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <FiTrash2 size={14} />
                <span>{isDemoMode ? 'Exit Demo' : 'Delete Goal'}</span>
              </button>
            </div>
          </div>

          <div className="row">
            {/* Left Column: Progress Ring & Projection chart */}
            <div className="col-md-4 mb-4">
              <PassionProgress 
                name={activeGoal.name}
                saved={activeGoal.currentSaved}
                target={activeGoal.targetAmount}
                percentage={metrics.progressPercentage}
                desiredDate={activeGoal.desiredDate}
              />
            </div>
            
            {/* Right Column: Key metrics */}
            <div className="col-md-8 mb-4">
              <PassionMetricsGrid 
                summary={financialSummary}
                metrics={metrics}
              />
            </div>
          </div>

          {/* Projection Chart & What-If Simulator section */}
          <div className="row">
            <div className="col-md-7 mb-4">
              <PassionRunwayChart 
                goal={activeGoal}
                metrics={metrics}
              />
            </div>
            
            <div className="col-md-5 mb-4">
              <WhatIfSimulator 
                currentReduction={simulatedReduction}
                currentAdditionalIncome={simulatedAdditionalIncome}
                currentPeriod={simulatedPeriod !== undefined ? simulatedPeriod : metrics.availableMonths}
                defaultPeriod={metrics.availableMonths}
                maxExpense={financialSummary.averageMonthlyExpense}
                estimatedCompletionMonthsOriginal={
                  calculatePassionMetrics(activeGoal, financialSummary, 0, 0, undefined, isDemoMode ? new Date() : undefined).estimatedCompletionMonths
                }
                estimatedCompletionMonthsSimulated={metrics.estimatedCompletionMonths}
                onChange={(reduction, addition, period) => {
                  setSimulatedReduction(reduction);
                  setSimulatedAdditionalIncome(addition);
                  setSimulatedPeriod(period);
                }}
                onReset={handleResetSimulator}
              />
            </div>
          </div>

          {/* Gemini AI Action Plan */}
          <PassionAIPlan 
            plan={aiPlan}
            loading={aiLoading}
            onGenerate={handleGenerateAIPlan}
            onDownloadPDF={handleDownloadPDF}
            isOnline={isOnline}
          />

          {/* Privacy statement info */}
          <PassionPrivacy />
        </div>
      )}
    </div>
  );
};

export default PassionGoalPage;
