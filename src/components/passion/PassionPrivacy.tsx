import React, { useState } from 'react';
import { FiShield, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const PassionPrivacy: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="passion-privacy glass-panel mb-4 animate-fade-in">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="d-flex justify-between align-center" 
        style={{ padding: '1rem 1.5rem', cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="d-flex align-center gap-2" style={{ color: '#0f766e', fontWeight: '700', fontSize: '0.925rem' }}>
          <FiShield size={18} />
          <span>How PassionLedger AI Protects Your Privacy</span>
        </div>
        {isOpen ? <FiChevronUp size={18} style={{ color: '#0f766e' }} /> : <FiChevronDown size={18} style={{ color: '#0f766e' }} />}
      </div>

      {isOpen && (
        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '1rem' }}>
          <p style={{ marginTop: 0 }}>
            PassionLedger AI is engineered around local-first, privacy-conscious data principles. Here is exactly what happens with your data:
          </p>
          
          <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Device Isolation</strong>: All raw transactions, notes, and attachments are stored locally inside your browser's IndexedDB. They never leave your device unless you choose to sync with Google Drive.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>User-Controlled Cloud Sync</strong>: The Google Drive backups are encrypted and saved strictly in your private Google Sheets spreadsheet (under your control). We do not run middleman database servers.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Zero Raw Logs Leakage</strong>: When you click <em>&quot;Generate My AI Passion Plan&quot;</em>, the application does <strong>not</strong> send your raw ledger, notes, payee list, phone numbers, or credit card details to the AI model.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Aggregated Summary Only</strong>: We calculate the sums and averages on your device locally, and send only the resulting numbers (e.g. total monthly expense, category average value) and your goal target to the Gemini endpoint.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Offline-First Calculations</strong>: All metrics, projections, milestone charts, and what-if simulation sliders run natively in client-side code. They are 100% functional even when you are offline or have no API key configured.
            </li>
          </ul>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8rem' }}>
            🔒 <strong>Verification</strong>: You can inspect the network requests made by this application. You will see that the POST request to the API contains only aggregated numbers and the name of the goal, never your personal notes or transactions.
          </div>
        </div>
      )}
    </div>
  );
};

export default PassionPrivacy;
