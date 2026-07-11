import React from 'react';
import { FiSliders, FiRefreshCw } from 'react-icons/fi';
import { formatCurrency } from '../../services/financeCalculator';

interface WhatIfSimulatorProps {
  currentReduction: number;
  currentAdditionalIncome: number;
  currentPeriod: number;
  defaultPeriod: number;
  maxExpense: number;
  estimatedCompletionMonthsOriginal: number | null;
  estimatedCompletionMonthsSimulated: number | null;
  onChange: (reduction: number, additionalIncome: number, period: number) => void;
  onReset: () => void;
}

const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentReduction,
  currentAdditionalIncome,
  currentPeriod,
  defaultPeriod,
  maxExpense,
  estimatedCompletionMonthsOriginal,
  estimatedCompletionMonthsSimulated,
  onChange,
  onReset
}) => {
  const maxReduction = Math.max(10000, Math.ceil(maxExpense / 1000) * 1000);

  const handleSliderChange = (name: string, value: number) => {
    if (name === 'reduction') {
      onChange(value, currentAdditionalIncome, currentPeriod);
    } else if (name === 'income') {
      onChange(currentReduction, value, currentPeriod);
    } else if (name === 'period') {
      onChange(currentReduction, currentAdditionalIncome, value);
    }
  };

  const getDynamicMessage = () => {
    if (estimatedCompletionMonthsOriginal === null || estimatedCompletionMonthsSimulated === null) {
      return null;
    }

    const diff = estimatedCompletionMonthsOriginal - estimatedCompletionMonthsSimulated;
    if (diff > 0) {
      return (
        <div style={{
          marginTop: '1rem',
          padding: '0.8rem 1.2rem',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          color: '#0f766e',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          ✨ This scenario moves your estimated completion date approximately {diff} {diff === 1 ? 'month' : 'months'} earlier!
        </div>
      );
    } else if (diff < 0) {
      return (
        <div style={{
          marginTop: '1rem',
          padding: '0.8rem 1.2rem',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          color: '#ef4444',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          ⚠️ This scenario extends your estimated completion by {Math.abs(diff)} {Math.abs(diff) === 1 ? 'month' : 'months'} later.
        </div>
      );
    }
    return null;
  };

  return (
    <div className="what-if-simulator glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div className="d-flex justify-between align-center mb-3">
        <div className="d-flex align-center gap-2">
          <FiSliders style={{ color: '#0f766e' }} size={20} />
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Interactive What-If Simulator</h3>
        </div>
        <button 
          onClick={onReset}
          className="btn-secondary d-flex align-center gap-1"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        >
          <FiRefreshCw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Control 1: Reduce Spending */}
      <div className="simulator-control mb-4">
        <div className="d-flex justify-between align-center mb-1">
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Reduce Optional Monthly Spending</label>
          <div className="d-flex align-center gap-1">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>₹</span>
            <input 
              type="number"
              min="0"
              max={maxReduction}
              value={currentReduction}
              onChange={e => handleSliderChange('reduction', Math.min(maxReduction, Number(e.target.value) || 0))}
              style={{ width: '80px', textAlign: 'right', padding: '0.2rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>
        <input 
          type="range"
          min="0"
          max={maxReduction}
          step="500"
          value={currentReduction}
          onChange={e => handleSliderChange('reduction', Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div className="d-flex justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>₹0</span>
          <span>Max safe cut: {formatCurrency(maxReduction)}</span>
        </div>
      </div>

      {/* Control 2: Increase Income */}
      <div className="simulator-control mb-4">
        <div className="d-flex justify-between align-center mb-1">
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Increase Monthly Earnings (Side Hustle/Extra)</label>
          <div className="d-flex align-center gap-1">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>₹</span>
            <input 
              type="number"
              min="0"
              max="100000"
              value={currentAdditionalIncome}
              onChange={e => handleSliderChange('income', Math.min(100000, Number(e.target.value) || 0))}
              style={{ width: '80px', textAlign: 'right', padding: '0.2rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>
        <input 
          type="range"
          min="0"
          max="50000"
          step="1000"
          value={currentAdditionalIncome}
          onChange={e => handleSliderChange('income', Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div className="d-flex justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>₹0</span>
          <span>₹50,000+</span>
        </div>
      </div>

      {/* Control 3: Change Goal Period */}
      <div className="simulator-control mb-3">
        <div className="d-flex justify-between align-center mb-1">
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Adjust Funding Timeline (Months)</label>
          <div className="d-flex align-center gap-1">
            <input 
              type="number"
              min="1"
              max="60"
              value={currentPeriod}
              onChange={e => handleSliderChange('period', Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              style={{ width: '60px', textAlign: 'center', padding: '0.2rem', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>months</span>
          </div>
        </div>
        <input 
          type="range"
          min="1"
          max="36"
          step="1"
          value={currentPeriod}
          onChange={e => handleSliderChange('period', Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div className="d-flex justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>1 month</span>
          <span>Original target: {defaultPeriod} months</span>
          <span>36 months</span>
        </div>
      </div>

      {getDynamicMessage()}
    </div>
  );
};

export default WhatIfSimulator;
