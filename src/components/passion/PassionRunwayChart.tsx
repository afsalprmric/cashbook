import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import type { PassionGoal, PassionMetrics } from '../../types/passion';
import { formatCurrency } from '../../services/financeCalculator';
import { FiTrendingUp } from 'react-icons/fi';

interface PassionRunwayChartProps {
  goal: PassionGoal;
  metrics: PassionMetrics;
}

const PassionRunwayChart: React.FC<PassionRunwayChartProps> = ({ goal, metrics }) => {
  const chartData = useMemo(() => {
    const saved = goal.currentSaved;
    const target = goal.targetAmount;
    
    // Safety thresholds for calculation
    const baseSavingsRate = metrics.safeMonthlyContribution;
    const simulatedSavingsRate = metrics.simulatedMonthlyContribution;
    
    // Choose how many months to project. 
    // We project up to estimated completion months, or desired months + 3, with a sensible clamp.
    const projectMonths = Math.min(
      24,
      Math.max(
        6,
        metrics.availableMonths,
        metrics.estimatedCompletionMonths || 0
      ) + 2
    );

    const data = [];
    for (let m = 0; m <= projectMonths; m++) {
      const baselineSavings = saved + m * baseSavingsRate;
      const simulatedSavings = saved + m * simulatedSavingsRate;

      data.push({
        month: `M${m}`,
        monthNumber: m,
        'Baseline growth': Math.round(baselineSavings),
        'Simulated growth': Math.round(simulatedSavings),
        'Goal target': target
      });
    }
    return data;
  }, [goal, metrics]);

  // Format Y-axis labels
  const formatYAxis = (value: number) => {
    if (value >= 100000) return `Rs ${Math.round(value / 1000)}k`;
    return `Rs ${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.8rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ margin: '0 0 0.4rem 0', fontWeight: 'bold' }}>{label === 'M0' ? 'Start (Current)' : `Month ${label.substring(1)}`}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.2rem 0' }}>
              <span>{p.name}:</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="passion-runway-chart glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div className="d-flex align-center gap-2 mb-3">
        <FiTrendingUp style={{ color: '#0f766e' }} size={20} />
        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Savings Projection Runway</h3>
      </div>
      
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis 
              dataKey="month" 
              stroke="var(--text-secondary)" 
              fontSize={10} 
              tickLine={false}
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              fontSize={10} 
              tickFormatter={formatYAxis}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
              verticalAlign="bottom"
              height={36}
            />
            
            {/* Goal threshold line */}
            <ReferenceLine 
              y={goal.targetAmount} 
              stroke="#ef4444" 
              strokeDasharray="5 5" 
              label={{ value: 'Target', position: 'top', fill: '#ef4444', fontSize: 10 }} 
            />

            {/* Target timeline reference line */}
            <ReferenceLine 
              x={`M${metrics.availableMonths}`} 
              stroke="rgba(255, 255, 255, 0.2)" 
              strokeDasharray="3 3" 
              label={{ value: 'Target Date', position: 'insideBottomLeft', fill: 'var(--text-secondary)', fontSize: 9 }} 
            />

            <Line 
              type="monotone" 
              dataKey="Baseline growth" 
              stroke="#94a3b8" 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Simulated growth" 
              stroke="#0f766e" 
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
        * The chart displays your projected savings curve under baseline settings vs. your simulated settings.
      </div>
    </div>
  );
};

export default PassionRunwayChart;
