import React from 'react';
import type { FinancialSummary, PassionMetrics } from '../../types/passion';
import { formatCurrency } from '../../services/financeCalculator';
import { 
  FiArrowUpRight, FiArrowDownRight, FiActivity, 
  FiCalendar, FiAlertTriangle, FiCheckCircle, FiMinus, FiDollarSign 
} from 'react-icons/fi';

interface PassionMetricsGridProps {
  summary: FinancialSummary;
  metrics: PassionMetrics;
}

const PassionMetricsGrid: React.FC<PassionMetricsGridProps> = ({ summary, metrics }) => {
  const getFeasibilityBadge = (status: string) => {
    switch (status) {
      case 'already_funded':
        return {
          label: 'Fully Funded',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.1)',
          icon: <FiCheckCircle style={{ color: '#10b981' }} />
        };
      case 'on_track':
        return {
          label: 'On Track',
          color: '#0f766e',
          bg: 'rgba(15, 118, 110, 0.1)',
          icon: <FiCheckCircle style={{ color: '#0f766e' }} />
        };
      case 'challenging_but_possible':
        return {
          label: 'Challenging But Possible',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.1)',
          icon: <FiActivity style={{ color: '#f59e0b' }} />
        };
      case 'currently_not_feasible':
      default:
        return {
          label: 'Not Feasible Currently',
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.1)',
          icon: <FiAlertTriangle style={{ color: '#ef4444' }} />
        };
    }
  };

  const badge = getFeasibilityBadge(metrics.feasibility);

  const metricCards = [
    {
      title: 'Average Monthly Income',
      value: formatCurrency(summary.averageMonthlyIncome),
      icon: <FiArrowUpRight size={20} style={{ color: '#10b981' }} />,
      desc: 'Based on last 90 days history'
    },
    {
      title: 'Average Monthly Expenses',
      value: formatCurrency(summary.averageMonthlyExpense),
      icon: <FiArrowDownRight size={20} style={{ color: '#ef4444' }} />,
      desc: 'Discretionary & fixed outgoings'
    },
    {
      title: 'Monthly Cash Surplus',
      value: formatCurrency(summary.averageMonthlySurplus),
      icon: <FiActivity size={20} style={{ color: summary.averageMonthlySurplus >= 0 ? '#0f766e' : '#ef4444' }} />,
      desc: 'Income minus expense balance'
    },
    {
      title: 'Safe Monthly Allocation',
      value: formatCurrency(metrics.safeMonthlyContribution),
      icon: <FiCheckCircle size={20} style={{ color: '#0f766e' }} />,
      desc: '80% of surplus (default buffer)'
    },
    {
      title: 'Required Monthly Savings',
      value: formatCurrency(metrics.requiredMonthlyContribution),
      icon: <FiDollarSign size={20} style={{ color: 'var(--text-primary)' }} />,
      desc: 'To reach goal within target'
    },
    {
      title: 'Simulated Monthly Contribution',
      value: formatCurrency(metrics.simulatedMonthlyContribution),
      icon: <FiActivity size={20} style={{ color: '#0f766e' }} />,
      desc: 'Base savings + simulator inputs',
      highlight: true
    },
    {
      title: 'Monthly Funding Gap',
      value: formatCurrency(metrics.fundingGapPerMonth),
      icon: <FiMinus size={20} style={{ color: metrics.fundingGapPerMonth > 0 ? '#f59e0b' : '#10b981' }} />,
      desc: 'Shortfall between required & simulated',
      textColor: metrics.fundingGapPerMonth > 0 ? '#f59e0b' : '#10b981'
    },
    {
      title: 'Estimated Completion Date',
      value: metrics.estimatedCompletionDate 
        ? new Date(metrics.estimatedCompletionDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
        : 'TBD',
      icon: <FiCalendar size={20} style={{ color: '#0f766e' }} />,
      desc: metrics.estimatedCompletionMonths 
        ? `Takes ~ ${metrics.estimatedCompletionMonths} months`
        : 'Requires positive contribution'
    }
  ];

  return (
    <div className="passion-metrics-section animate-fade-in" style={{ marginBottom: '2rem' }}>
      {/* Feasibility Status Card */}
      <div className="glass-panel d-flex justify-between align-center flex-wrap gap-3 mb-4" style={{ padding: '1.2rem 1.8rem', borderLeft: `6px solid ${badge.color}` }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>FEASIBILITY ASSESSMENT</span>
          <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
            We classify your dream as:
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', padding: '0.6rem 1.2rem', backgroundColor: badge.bg, color: badge.color, borderRadius: '30px', fontWeight: '700', fontSize: '0.95rem' }} className="d-flex align-center">
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="metrics-grid">
        {metricCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`glass-panel metric-card ${card.highlight ? 'highlight-border' : ''}`}
            style={{ 
              padding: '1.2rem',
              border: card.highlight ? '1px solid #0f766e' : undefined,
              boxShadow: card.highlight ? '0 0 15px rgba(15, 118, 110, 0.15)' : undefined
            }}
          >
            <div className="d-flex justify-between align-center mb-2">
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{card.title}</span>
              {card.icon}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: card.textColor || 'var(--text-primary)', marginBottom: '0.4rem' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              {card.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PassionMetricsGrid;
