import React from 'react';
import { FiHeart, FiPlay, FiPlusCircle, FiShield } from 'react-icons/fi';

interface PassionHeroProps {
  onCreateGoal: () => void;
  onStartDemo: () => void;
}

const PassionHero: React.FC<PassionHeroProps> = ({ onCreateGoal, onStartDemo }) => {
  return (
    <div className="passion-hero glass-panel text-center animate-fade-in" style={{ padding: '3rem 2rem', marginBottom: '2rem' }}>
      <div className="passion-hero-badge" style={{ display: 'inline-flex', alignSelf: 'center', backgroundColor: 'rgba(15, 118, 110, 0.1)', padding: '0.5rem 1rem', borderRadius: '50px', color: '#0f766e', fontWeight: '600', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <FiHeart className="beat-animation" />
        <span>PassionLedger AI</span>
      </div>
      
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2', maxWidth: '800px', margin: '0 auto 1rem auto' }}>
        Turn everyday spending into a plan for the dream you care about.
      </h1>
      
      <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem auto', lineHeight: '1.5' }}>
        Your cashbook should not only explain your past. It should help build the future that matters to you.
      </p>
      
      <div className="d-flex justify-center gap-3 flex-wrap" style={{ marginBottom: '2.5rem' }}>
        <button 
          onClick={onCreateGoal}
          className="btn-primary d-flex align-center gap-2"
          style={{ padding: '0.8rem 1.8rem', fontSize: '1.05rem' }}
        >
          <FiPlusCircle size={20} />
          <span>Create My Passion Plan</span>
        </button>
        
        <button 
          onClick={onStartDemo}
          className="btn-secondary d-flex align-center gap-2"
          style={{ padding: '0.8rem 1.8rem', fontSize: '1.05rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <FiPlay size={20} />
          <span>Try the 60-Second Demo</span>
        </button>
      </div>

      <div className="privacy-badge d-flex align-center justify-center gap-2" style={{ maxWidth: '600px', margin: '0 auto', padding: '0.8rem 1.2rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <FiShield size={18} style={{ color: '#0f766e', flexShrink: 0 }} />
        <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
          <strong>Privacy First</strong>: Your complete transaction history stays on your device. Only a compact financial summary is shared when you request an AI plan.
        </span>
      </div>
    </div>
  );
};

export default PassionHero;
