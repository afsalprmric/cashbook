import React, { useState, useEffect } from 'react';
import type { PassionPlan } from '../../types/passion';
import { formatCurrency } from '../../services/financeCalculator';
import { 
  FiCpu, FiCheckSquare, FiSquare, FiDownload, 
  FiCompass, FiAlertTriangle, FiBookOpen 
} from 'react-icons/fi';

interface PassionAIPlanProps {
  plan: PassionPlan | null;
  loading: boolean;
  onGenerate: () => void;
  onDownloadPDF: () => void;
  isOnline: boolean;
}

const PassionAIPlan: React.FC<PassionAIPlanProps> = ({
  plan,
  loading,
  onGenerate,
  onDownloadPDF,
  isOnline
}) => {
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    'Studying your verified financial summary...',
    'Building a realistic passion plan...',
    'Optimizing category opportunities...',
    'Drafting customized weekly actions...',
    'Preparing your milestones...'
  ];

  // Rotate loading messages
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const toggleAction = (idx: number) => {
    setCompletedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };



  return (
    <div className="passion-ai-plan glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
      {/* 1. Empty / Un-generated State */}
      {!plan && !loading && (
        <div className="text-center py-4">
          <div style={{ fontSize: '3rem', color: '#0f766e', marginBottom: '1rem' }}>
            <FiCpu className="pulse-animation" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>AI-Powered Dream Strategy</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
            Analyze your financial profile and let Gemini generate customized spending tips, milestones, and action items to fund your dream responsibly.
          </p>
          <button 
            onClick={onGenerate}
            className="btn-primary d-flex align-center gap-2"
            style={{ margin: '0 auto', padding: '0.7rem 1.5rem' }}
          >
            <FiCpu size={18} />
            <span>Generate My AI Passion Plan</span>
          </button>
          {!isOnline && (
            <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#f59e0b' }}>
              ℹ️ Offline mode: Local fallback plan will be created immediately.
            </div>
          )}
        </div>
      )}

      {/* 2. Loading State */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner mb-4" style={{
            margin: '0 auto',
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #0f766e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f766e', fontWeight: '700' }} className="pulse-animation">
            {loadingMessages[loadingMessageIndex]}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Processing local mathematical calculations and mapping AI prompts...
          </p>
        </div>
      )}

      {/* 3. Success / Rendered Plan State */}
      {plan && !loading && (
        <div className="ai-plan-content">
          {/* Header row */}
          <div className="d-flex justify-between align-center flex-wrap gap-2 mb-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
            <div>
              <div className="d-flex align-center gap-2">
                <FiCpu style={{ color: '#0f766e' }} size={20} />
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                  {plan.source === 'gemini' ? 'Gemini AI Aspirational Plan' : 'Deterministic Local Plan'}
                </h3>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                Generated at {new Date(plan.generatedAt).toLocaleTimeString('en-IN')} | Source: {plan.source === 'gemini' ? 'Google Gemini API' : 'Local Fallback'}
              </span>
            </div>
            
            <button 
              onClick={onDownloadPDF}
              className="btn-primary d-flex align-center gap-2"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <FiDownload size={16} />
              <span>Download Passion Plan PDF</span>
            </button>
          </div>

          {/* Fallback alert notice */}
          {plan.source === 'local_fallback' && (
            <div className="d-flex align-center gap-2 mb-3" style={{ padding: '0.8rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '0.825rem', color: '#d97706' }}>
              <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>AI guidance is temporarily offline/unconfigured. Your locally calculated passion plan is shown instead.</span>
            </div>
          )}

          {/* Headline & Summary */}
          <div className="mb-4">
            <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.6rem', fontWeight: '700' }}>
              {plan.headline}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              {plan.summary}
            </p>
          </div>

          {/* Recommended monthly target */}
          <div className="glass-panel d-flex justify-between align-center mb-4" style={{ padding: '1rem', backgroundColor: 'rgba(15, 118, 110, 0.05)', border: '1px solid rgba(15, 118, 110, 0.2)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>RECOMMENDED MONTHLY TARGET</span>
              <h5 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f766e' }}>
                {formatCurrency(plan.suggestedMonthlyContribution)} / mo
              </h5>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px', textAlign: 'right' }}>
              Allocating this amount consistently reaches your dream milestone safely.
            </div>
          </div>

          <div className="row">
            {/* Practical Suggestions Card List */}
            <div className="col-md-7 mb-4">
              <h5 className="d-flex align-center gap-2 mb-3" style={{ fontSize: '1rem', fontWeight: '700' }}>
                <FiCompass size={16} style={{ color: '#0f766e' }} />
                <span>Opportunities & Action Plan</span>
              </h5>
              
              <div className="d-flex flex-column gap-3">
                {plan.suggestions.map((s, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #0f766e' }}>
                    <div className="d-flex justify-between align-center mb-1 flex-wrap">
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{s.title}</span>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', color: 'var(--text-secondary)' }}>
                        {s.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                      {s.action}
                    </p>
                    <div className="d-flex justify-between align-center" style={{ fontSize: '0.8rem', borderTop: '1px dashed rgba(255, 255, 255, 0.05)', paddingTop: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.reason}</span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>+ {formatCurrency(s.estimatedMonthlyImpact)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist & Milestones */}
            <div className="col-md-5 mb-4">
              {/* First week action items */}
              <div className="mb-4">
                <h5 className="d-flex align-center gap-2 mb-3" style={{ fontSize: '1rem', fontWeight: '700' }}>
                  <FiCheckSquare size={16} style={{ color: '#0f766e' }} />
                  <span>First-Week Setup Checklist</span>
                </h5>
                <div className="d-flex flex-column gap-2">
                  {plan.firstWeekActions.map((action, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleAction(idx)}
                      className="d-flex align-center gap-2" 
                      style={{ 
                        fontSize: '0.85rem', 
                        cursor: 'pointer',
                        padding: '0.5rem',
                        backgroundColor: completedActions[idx] ? 'rgba(15, 118, 110, 0.04)' : 'transparent',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                    >
                      {completedActions[idx] ? (
                        <FiCheckSquare style={{ color: '#0f766e', flexShrink: 0 }} size={18} />
                      ) : (
                        <FiSquare style={{ color: 'var(--text-secondary)', flexShrink: 0 }} size={18} />
                      )}
                      <span style={{ 
                        textDecoration: completedActions[idx] ? 'line-through' : 'none',
                        color: completedActions[idx] ? 'var(--text-secondary)' : 'var(--text-primary)'
                      }}>
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones timeline */}
              <div>
                <h5 className="d-flex align-center gap-2 mb-3" style={{ fontSize: '1rem', fontWeight: '700' }}>
                  <FiBookOpen size={16} style={{ color: '#0f766e' }} />
                  <span>Funding Checkpoints</span>
                </h5>
                <div className="milestones-timeline d-flex flex-column gap-2" style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.05)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                  {plan.milestones.map((m, idx) => (
                    <div key={idx} style={{ position: 'relative', paddingBottom: '0.5rem' }}>
                      {/* Circle indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '-21px',
                        top: '4px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#0f766e',
                        border: '2px solid var(--bg-primary)'
                      }} />
                      <div className="d-flex justify-between" style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '600' }}>{m.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: '600' }}>
                          {m.estimatedDate ? `Est. ${m.estimatedDate}` : 'TBD'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Target: {formatCurrency(m.targetAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Encouragement Footer */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            textAlign: 'center',
            fontSize: '0.95rem',
            fontStyle: 'italic',
            color: 'var(--text-secondary)'
          }}>
            &ldquo;{plan.encouragement}&rdquo;
          </div>

          {/* Regenerate Button */}
          <div className="d-flex justify-center mt-3 gap-2">
            <button 
              onClick={onGenerate}
              className="btn-secondary d-flex align-center gap-2"
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
            >
              <FiCpu size={16} />
              <span>Regenerate Plan</span>
            </button>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
            Disclaimer: This is custom planning guidance based on cashbook transaction metrics, not professional financial advice.
          </div>
        </div>
      )}
    </div>
  );
};

export default PassionAIPlan;
