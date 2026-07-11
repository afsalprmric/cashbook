import React from 'react';
import { formatCurrency } from '../../services/financeCalculator';
import { FiAward } from 'react-icons/fi';

interface PassionProgressProps {
  name: string;
  saved: number;
  target: number;
  percentage: number;
  desiredDate: string;
}

const PassionProgress: React.FC<PassionProgressProps> = ({
  name,
  saved,
  target,
  percentage,
  desiredDate
}) => {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="passion-progress glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
      <div className="d-flex align-center gap-2 mb-3 w-100" style={{ justifyContent: 'center' }}>
        <FiAward style={{ color: '#0f766e' }} size={20} />
        <h3 style={{ margin: 0, fontSize: '1.15rem', textAlign: 'center' }}>Goal Progress</h3>
      </div>
      
      <div style={{ position: 'relative', width: `${radius * 2}px', height: '${radius * 2}px` }} className="mb-3">
        <svg
          height={radius * 2}
          width={radius * 2}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            stroke="rgba(255, 255, 255, 0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke="#0f766e"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {Math.round(percentage)}%
          </span>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            saved
          </span>
        </div>
      </div>

      <div className="text-center w-100">
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }} className="gradient-text">{name}</h4>
        <div className="d-flex justify-between mb-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Current Saved:</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{formatCurrency(saved)}</span>
        </div>
        <div className="d-flex justify-between mb-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target Amount:</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{formatCurrency(target)}</span>
        </div>
        <div className="d-flex justify-between">
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Desired Date:</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f766e' }}>
            {new Date(desiredDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PassionProgress;
