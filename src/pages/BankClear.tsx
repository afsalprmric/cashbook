import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Fund } from '../db/database';
import { FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import './BankClear.css';

const BankClear = () => {
  // Local storage states for simple numeric inputs
  const [cashInHand, setCashInHand] = useState<number>(0);
  const [statementBalance, setStatementBalance] = useState<number>(0);

  useEffect(() => {
    const savedCash = localStorage.getItem('cashbook_cashInHand');
    const savedStatement = localStorage.getItem('cashbook_statementBalance');
    if (savedCash) setCashInHand(parseFloat(savedCash));
    if (savedStatement) setStatementBalance(parseFloat(savedStatement));
  }, []);

  const handleCashInHandChange = (val: number) => {
    setCashInHand(val);
    localStorage.setItem('cashbook_cashInHand', val.toString());
  };

  const handleStatementBalanceChange = (val: number) => {
    setStatementBalance(val);
    localStorage.setItem('cashbook_statementBalance', val.toString());
  };

  // Fund Form State
  const [showFundForm, setShowFundForm] = useState<'primary_fund' | 'secondary_account' | null>(null);
  const [editFundId, setEditFundId] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState({ name: '', balance: '' });

  // Data Queries
  const funds = useLiveQuery(() => db.funds.toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const { primaryFunds, secondaryAccounts, primarySum, secondarySum, myBal, totalAppBalance } = useMemo(() => {
    if (!funds || !transactions) return { primaryFunds: [], secondaryAccounts: [], primarySum: 0, secondarySum: 0, myBal: 0, totalAppBalance: 0 };

    const pFunds = funds.filter(f => f.type === 'primary_fund');
    const sAccounts = funds.filter(f => f.type === 'secondary_account');

    const pSum = pFunds.reduce((acc, f) => acc + f.balance, 0);
    const sSum = sAccounts.reduce((acc, f) => acc + f.balance, 0);

    let tInc = 0;
    let tExp = 0;
    transactions.forEach(t => {
      if (t.type === 'income') tInc += t.amount;
      if (t.type === 'expense') tExp += t.amount;
    });

    const appBal = tInc - tExp;
    const mBal = appBal - cashInHand;

    return { primaryFunds: pFunds, secondaryAccounts: sAccounts, primarySum: pSum, secondarySum: sSum, myBal: mBal, totalAppBalance: appBal };
  }, [funds, transactions, cashInHand]);

  // Overall Calculation matching Spreadsheet Logic:
  // Calculated Bank Total = Sum(Funds) + My Bal - Sum(Secondary Accounts)
  const calculatedTotal = primarySum + myBal - secondarySum;
  
  // Is it cleared? Allowing tiny floating point threshold
  const isCleared = Math.abs(calculatedTotal - statementBalance) < 0.01;

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundForm.name || !fundForm.balance || !showFundForm) return;

    if (editFundId) {
      await db.funds.update(editFundId, {
        name: fundForm.name,
        balance: parseFloat(fundForm.balance),
        updatedAt: Date.now()
      });
    } else {
      const newFund: Fund = {
        id: uuidv4(),
        name: fundForm.name,
        type: showFundForm,
        balance: parseFloat(fundForm.balance),
        updatedAt: Date.now()
      };
      await db.funds.add(newFund);
    }

    setFundForm({ name: '', balance: '' });
    setEditFundId(null);
    setShowFundForm(null);
  };

  const deleteFund = async (id: string) => {
    if (window.confirm("Remove this fund?")) {
      await db.funds.delete(id);
    }
  };

  const startEditFund = (f: Fund) => {
    setFundForm({ name: f.name, balance: f.balance.toString() });
    setShowFundForm(f.type);
    setEditFundId(f.id);
  };

  const renderFundTable = (items: Fund[], type: 'primary_fund' | 'secondary_account', title: string) => (
    <div className="clear-section mb-6">
      <div className="d-flex align-center justify-between">
        <h3 className="section-title mb-0">{title}</h3>
        <button className="btn-secondary d-flex align-center gap-1" style={{ padding: '0.4rem 0.6rem' }} onClick={() => {
          setShowFundForm(showFundForm === type && !editFundId ? null : type);
          setEditFundId(null);
          setFundForm({ name: '', balance: '' });
        }}>
          <FiPlus /> Add
        </button>
      </div>

      {showFundForm === type && (
        <form onSubmit={handleFundSubmit} className="clear-input-group mt-4 glass-panel p-4">
          <input type="text" className="form-input" placeholder="Fund Name" value={fundForm.name} onChange={(e) => setFundForm(prev => ({...prev, name: e.target.value}))} required />
          <input type="number" step="0.01" className="form-input" placeholder="Amount" value={fundForm.balance} onChange={(e) => setFundForm(prev => ({...prev, balance: e.target.value}))} required />
          <button type="submit" className="btn-primary">{editFundId ? 'Save' : 'Add'}</button>
        </form>
      )}

      {items.length > 0 ? (
        <table className="clear-table">
          <tbody>
            {items.map(f => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td className="amount-cell">₹ {f.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="actions-cell">
                   <button className="btn-icon" onClick={() => startEditFund(f)}><FiEdit2 /></button>
                   <button className="btn-icon text-error" onClick={() => deleteFund(f.id)}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted mt-4">No {type === 'primary_fund' ? 'funds' : 'accounts'} added yet.</p>
      )}
    </div>
  );

  return (
    <div className="bank-clear-page layout-content fade-in">
      <h2 className="page-title mb-2">Bank Clearing</h2>
      <p className="text-secondary mb-6">Reconcile your actual bank statement against your application ledger.</p>

      {renderFundTable(primaryFunds, 'primary_fund', 'Bank Funds (Primary)')}

      <div className="clear-section mb-6">
        <h3 className="section-title">My Cash & Balance</h3>
        <div className="clear-summary-row">
          <span className="clear-summary-label">App Cashflow Balance:</span>
          <span className="clear-summary-value text-primary">₹ {totalAppBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="clear-summary-row">
          <span className="clear-summary-label">Hand (Cash you hold):</span>
          <input 
             type="number" 
             step="0.01" 
             className="form-input" 
             style={{ width: '150px', textAlign: 'right' }} 
             value={cashInHand || ''} 
             onChange={(e) => handleCashInHandChange(parseFloat(e.target.value) || 0)} 
             placeholder="0.00"
          />
        </div>
        <div className="clear-summary-row pb-0" style={{ borderBottom: 'none' }}>
          <span className="clear-summary-label" style={{ color: 'var(--hover-bg)' }}>My cash in bank (My Bal):</span>
          <span className={`clear-summary-value ${myBal < 0 ? 'text-error' : 'text-success'}`}>
            ₹ {myBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {renderFundTable(secondaryAccounts, 'secondary_account', 'Secondary Accounts (Deducted)')}

      <div className="clear-section mb-6" style={{ background: 'var(--sidebar-bg)' }}>
        <h3 className="section-title">Final Calculation</h3>
        <div className="clear-summary-row" style={{ borderBottom: 'none' }}>
          <span className="clear-summary-label text-lg">Calculated Total in Bank:</span>
          <span className="clear-summary-value text-lg">
            ₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={`clear-match-box ${statementBalance > 0 ? (isCleared ? 'matched' : 'unmatched') : ''}`}>
          <h4 className="mb-4">Enter Actual Bank Statement Balance to CLEAR</h4>
          <input 
            type="number" 
            step="0.01"
            className="form-input statement-input"
            value={statementBalance || ''} 
            onChange={(e) => handleStatementBalanceChange(parseFloat(e.target.value) || 0)} 
            placeholder="0.00"
          />
          
          {statementBalance > 0 && (
            <div className="mt-4 d-flex align-center gap-2" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isCleared ? (
                <><FiCheckCircle color="var(--success)" size={28} /> <span className="text-success">Perfectly Balanced!</span></>
              ) : (
                <><FiXCircle color="var(--error)" size={28} /> <span className="text-error">Difference: ₹ {Math.abs(calculatedTotal - statementBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BankClear;
