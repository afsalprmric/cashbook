import React from 'react';
import { FiAlertCircle, FiXCircle } from 'react-icons/fi';

interface DemoBadgeProps {
  onExit: () => void;
}

const DemoBadge: React.FC<DemoBadgeProps> = ({ onExit }) => {
  return (
    <div 
      className="demo-badge-container glass-panel animate-fade-in" 
      style={{
        padding: '0.6rem 1.2rem',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}
    >
      <div className="d-flex align-center gap-2" style={{ color: '#d97706', fontSize: '0.875rem', fontWeight: '600' }}>
        <FiAlertCircle className="pulse-animation" size={18} style={{ flexShrink: 0 }} />
        <span>Demo Mode Active: You are exploring PassionLedger AI with mock data. Real transactions are untouched.</span>
      </div>
      
      <button 
        onClick={onExit}
        className="btn-secondary d-flex align-center gap-1"
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '0.8rem',
          backgroundColor: 'rgba(217, 119, 6, 0.2)',
          color: '#fff',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          cursor: 'pointer'
        }}
      >
        <FiXCircle size={14} />
        <span>Exit Demo</span>
      </button>
    </div>
  );
};

export default DemoBadge;
