import React from 'react';
import { FiShield, FiLock, FiDatabase, FiCloud, FiCheckCircle } from 'react-icons/fi';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="layout-content fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      <div className="card glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <FiShield style={{ fontSize: '2rem', color: 'var(--primary-500)' }} />
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>Last updated: September 22, 2026</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.6 }}>
          
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FiLock style={{ color: 'var(--primary-500)' }} /> 1. Overview & Privacy Commitment
            </h3>
            <p className="text-secondary">
              Welcome to <strong>Cashbook</strong>. Your financial privacy is our highest priority. Cashbook is designed as a local-first application. We do not run external tracking servers or collect your personal financial records for monetization or advertising.
            </p>
          </section>

          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FiDatabase style={{ color: 'var(--primary-500)' }} /> 2. Data Storage & Local Security
            </h3>
            <p className="text-secondary">
              All transactions, loans, credit card balances, investment accounts, and category preferences are stored locally in your browser database (IndexedDB). Your data remains strictly on your device unless you explicitly opt to perform cloud backups.
            </p>
          </section>

          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FiCloud style={{ color: 'var(--primary-500)' }} /> 3. Google Drive Sync & Limited Use Policy
            </h3>
            <p className="text-secondary">
              If you enable Google Drive Cloud Backup:
            </p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
              <li>Cashbook uses official Google OAuth 2.0 to request permission to write backup files (`Cashbook_Lite_Backup`) directly into your personal Google Drive / Google Sheets.</li>
              <li>Cashbook does <strong>NOT</strong> access, read, or modify any other files in your Google Drive outside of its own backup sheet.</li>
              <li>Cashbook’s use of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FiCheckCircle style={{ color: 'var(--primary-500)' }} /> 4. Data Sharing & Third Parties
            </h3>
            <p className="text-secondary">
              We do <strong>not</strong> sell, rent, trade, or share your personal financial data with any third party, advertising networks, or data brokers under any circumstances.
            </p>
          </section>

          <section style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Contact Us</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0 }}>
              If you have any questions about this Privacy Policy, you can reach out via your Cashbook application settings or your repository administrator.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
