import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Loan, type LoanRepayment } from '../db/database';
import {
  FiPlus, FiTrash2, FiMessageCircle, FiCheckCircle,
  FiEdit2, FiDollarSign, FiUser, FiPhone, FiArrowLeft, FiBook
} from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import './Loans.css';

const calculateEffectiveRepaid = (loan: Loan) => {
  return (loan.repayments || []).reduce((acc, r) => {
     const rType = r.type || (loan.type === 'lent' ? 'received' : 'given');
     if (loan.type === 'lent') {
         return acc + (rType === 'received' ? r.amount : -r.amount);
     } else {
         return acc + (rType === 'given' ? r.amount : -r.amount);
     }
  }, 0);
};

const Loans = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Loan>>({
    type: 'lent',
    status: 'pending',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [activeRepayLoanId, setActiveRepayLoanId] = useState<string | null>(null);
  const [repayForm, setRepayForm] = useState<{ amount: string, date: string, note: string, type?: 'given' | 'received' }>({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '', type: undefined });
  const [editRepaymentId, setEditRepaymentId] = useState<string | null>(null);

  // Per-payee ledger
  const [selectedPayee, setSelectedPayee] = useState<string | null>(null);

  const loans = useLiveQuery(() => db.loans.orderBy('date').reverse().toArray());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? (parseFloat(value) || '') : value
    }));
  };

  const handleRepayChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setRepayForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const startEdit = (loan: Loan) => {
    setEditLoanId(loan.id);
    setFormData({
      type: loan.type,
      amount: loan.amount,
      payeeName: loan.payeeName,
      payeePhone: loan.payeePhone,
      date: loan.date.split('T')[0],
      status: loan.status,
      note: loan.note
    });
    setShowAddForm(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.payeeName) return alert('Amount and Payee Name are required');

    if (editLoanId) {
      await db.loans.update(editLoanId, {
        type: formData.type as 'lent' | 'borrowed',
        amount: Number(formData.amount),
        payeeName: formData.payeeName,
        payeePhone: formData.payeePhone || '',
        date: formData.date || new Date().toISOString(),
        note: formData.note || '',
        updatedAt: Date.now()
      });
    } else {
      const newLoan: Loan = {
        id: uuidv4(),
        type: formData.type as 'lent' | 'borrowed',
        amount: Number(formData.amount),
        payeeName: formData.payeeName,
        payeePhone: formData.payeePhone || '',
        date: formData.date || new Date().toISOString(),
        status: formData.status as 'pending' | 'settled',
        note: formData.note || '',
        repayments: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.loans.add(newLoan);
    }

    setShowAddForm(false);
    setEditLoanId(null);
    setFormData({ type: 'lent', status: 'pending', date: format(new Date(), 'yyyy-MM-dd') });
  };

  const submitRepayment = async (loan: Loan) => {
    if (!repayForm.amount) return;
    const amount = Number(repayForm.amount);
    
    if (editRepaymentId) {
      const updatedRepayments = (loan.repayments || []).map(r => 
        r.id === editRepaymentId ? { ...r, amount, date: repayForm.date || format(new Date(), 'yyyy-MM-dd'), note: repayForm.note, type: repayForm.type } : r
      );
      const totalRepaid = calculateEffectiveRepaid({ ...loan, repayments: updatedRepayments });
      const newStatus = totalRepaid >= loan.amount ? 'settled' : loan.status;
      await db.loans.update(loan.id, { repayments: updatedRepayments, status: newStatus, updatedAt: Date.now() });
      setEditRepaymentId(null);
    } else {
      const newRepayment: LoanRepayment = {
        id: uuidv4(),
        amount: amount,
        date: repayForm.date || format(new Date(), 'yyyy-MM-dd'),
        note: repayForm.note,
        type: repayForm.type || (loan.type === 'lent' ? 'received' : 'given')
      };

      const updatedRepayments = [...(loan.repayments || []), newRepayment];
      const totalRepaid = calculateEffectiveRepaid({ ...loan, repayments: updatedRepayments });
      const newStatus = totalRepaid >= loan.amount ? 'settled' : loan.status;

      await db.loans.update(loan.id, {
        repayments: updatedRepayments,
        status: newStatus,
        updatedAt: Date.now()
      });
    }

    setActiveRepayLoanId(null);
    setRepayForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '', type: undefined });
  };

  const deleteRepayment = async (loan: Loan, repaymentId: string) => {
    if (window.confirm("Remove this repayment record?")) {
      const updatedRepayments = (loan.repayments || []).filter(r => r.id !== repaymentId);
      const totalRepaid = calculateEffectiveRepaid({ ...loan, repayments: updatedRepayments });
      const newStatus = totalRepaid >= loan.amount ? 'settled' : 'pending';
      await db.loans.update(loan.id, { repayments: updatedRepayments, status: newStatus, updatedAt: Date.now() });
    }
  };

  const startEditRepayment = (loan: Loan, rp: LoanRepayment) => {
    setActiveRepayLoanId(loan.id);
    setEditRepaymentId(rp.id);
    setRepayForm({
      amount: rp.amount.toString(),
      date: rp.date.split('T')[0],
      note: rp.note || '',
      type: rp.type || (loan.type === 'lent' ? 'received' : 'given')
    });
  };

  const deleteLoan = async (id: string) => {
    if (window.confirm('Delete this entire loan record?')) {
      await db.loans.delete(id);
    }
  };

  const toggleStatus = async (loan: Loan) => {
    const newStatus = loan.status === 'pending' ? 'settled' : 'pending';
    await db.loans.update(loan.id, { status: newStatus, updatedAt: Date.now() });
  };

  const sendWhatsApp = (loan: Loan, remainingBalance: number) => {
    if (!loan.payeePhone) return alert('No phone number provided for this payee.');
    const phone = loan.payeePhone.replace(/[^0-9]/g, '');
    let message = '';
    
    if (loan.status === 'settled') {
      message = `Hi ${loan.payeeName}, thanking you! The loan of ₹${loan.amount} dated ${format(parseISO(loan.date.split('T')[0]), 'dd/MM/yyyy')} is fully settled.`;
    } else {
      message = `Hi ${loan.payeeName}, this is regarding the ${loan.type === 'lent' ? 'loan given of' : 'received amount of'} ₹${loan.amount} dated ${format(parseISO(loan.date.split('T')[0]), 'dd/MM/yyyy')}. Remaining Balance: ₹${remainingBalance}.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Pick contact from phone
  const pickContact = async () => {
    if (!(navigator as any).contacts) {
      alert('Contact Picker is only available on Android Chrome. Please type the name and number manually.');
      return;
    }
    try {
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name?.[0] || '';
        const phone = contact.tel?.[0] || '';
        setFormData(prev => ({ ...prev, payeeName: name, payeePhone: phone }));
      }
    } catch (err) {
      console.error('Contact picker error:', err);
    }
  };

  const getPayeeSummary = (payeeName: string) => {
    if (!loans) return { given: 0, received: 0, netBalance: 0, allLoans: [] };
    const payeeLoans = loans.filter(l => l.payeeName === payeeName);
    const given = payeeLoans.filter(l => l.type === 'lent').reduce((s, l) => s + l.amount, 0);
    const received = payeeLoans.filter(l => l.type === 'borrowed').reduce((s, l) => s + l.amount, 0);
    const totalRepaidOnLent = payeeLoans
      .filter(l => l.type === 'lent')
      .reduce((s, l) => s + calculateEffectiveRepaid(l), 0);
    const totalRepaidOnBorrowed = payeeLoans
      .filter(l => l.type === 'borrowed')
      .reduce((s, l) => s + calculateEffectiveRepaid(l), 0);

    return {
      given,
      received,
      netBalance: (given - totalRepaidOnLent) - (received - totalRepaidOnBorrowed),
      allLoans: payeeLoans
    };
  };

  // --- PER-PAYEE LEDGER VIEW ---
  if (selectedPayee) {
    const { given, received, netBalance, allLoans } = getPayeeSummary(selectedPayee);

    return (
      <div className="loans-page layout-content fade-in">
        <div className="d-flex align-center gap-3 mb-4">
          <button className="btn-icon" onClick={() => setSelectedPayee(null)}>
            <FiArrowLeft size={22} />
          </button>
          <div>
            <h2 className="page-title mb-0">{selectedPayee}</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Full Liability Ledger</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Given</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--error)' }}>₹{given.toLocaleString()}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Received</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>₹{received.toLocaleString()}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Net Balance</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: netBalance > 0 ? 'var(--error)' : 'var(--success)' }}>
              {netBalance > 0 ? `They owe ₹${netBalance.toLocaleString()}` : netBalance < 0 ? `You owe ₹${Math.abs(netBalance).toLocaleString()}` : 'Settled'}
            </p>
          </div>
        </div>

        {/* Loan Records */}
        <div className="loans-list">
          {allLoans.map(loan => {
            const totalRepaid = calculateEffectiveRepaid(loan);
            const remainingBalance = Math.max(0, loan.amount - totalRepaid);
            const progressPercent = Math.min(100, Math.round((totalRepaid / loan.amount) * 100));

            return (
              <div key={loan.id} className="loan-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="loan-details">
                    <span className={`loan-amount ${loan.type}`} style={{ fontSize: '1rem' }}>
                      {loan.type === 'lent' ? '↓ Given: ' : '↑ Received: '} ₹{loan.amount.toLocaleString()}
                    </span>
                    <div className="loan-meta">
                      <span>{format(parseISO(loan.date.split('T')[0]), 'dd MMM yyyy')}</span>
                      {loan.note && <span>• {loan.note}</span>}
                    </div>
                  </div>
                  <span className={`status-badge ${loan.status}`}>{loan.status}</span>
                </div>

                {/* Progress */}
                <div className="loan-progress-container">
                  <div className="loan-progress-text">
                    <span>{loan.status === 'settled' || remainingBalance === 0 ? 'Fully Settled' : `₹${remainingBalance.toLocaleString()} remaining`}</span>
                    <span>{progressPercent}% Repaid</span>
                  </div>
                  <div className="loan-progress-bar">
                    <div className={`loan-progress-fill ${loan.status === 'settled' ? 'settled' : ''}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {/* Repayment History */}
                {loan.repayments && loan.repayments.length > 0 && (
                  <div className="repayment-history">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Payment History</h4>
                    {loan.repayments.map(rp => {
                      const rType = rp.type || (loan.type === 'lent' ? 'received' : 'given');
                      const typeLabel = rType === 'given' ? 'Given' : 'Received';
                      const colorClass = rType === 'received' ? 'text-success' : 'text-error';
                      return (
                        <div key={rp.id} className="repayment-item">
                          <span className="date">{format(parseISO(rp.date), 'dd MMM yy')}</span>
                          <span className={`badge ${colorClass}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid', whiteSpace: 'nowrap' }}>{typeLabel}</span>
                          <span className="note" style={{ flex: 1, marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rp.note || 'Partial Payment'}</span>
                          <span className={`amount ${colorClass}`} style={{ whiteSpace: 'nowrap' }}>₹ {rp.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- MAIN LIABILITIES VIEW ---
  return (
    <div className="loans-page layout-content fade-in">
      <div className="d-flex align-center justify-between flex-wrap" style={{ gap: '1rem' }}>
        <h2 className="page-title mb-0">Liabilities</h2>
        <button className="btn-primary d-flex align-center gap-2" onClick={() => {
          setShowAddForm(!showAddForm);
          if (editLoanId) setEditLoanId(null);
          setFormData({ type: 'lent', status: 'pending', date: format(new Date(), 'yyyy-MM-dd') });
        }}>
          <FiPlus /> {showAddForm || editLoanId ? 'Cancel' : 'New Liability'}
        </button>
      </div>

      {(showAddForm || editLoanId) && (
        <div className="card glass-panel fade-in mt-4 border-primary">
          <h3 className="mb-4">{editLoanId ? 'Edit Liability' : 'Add New Liability'}</h3>
          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ gap: '1.5rem' }}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label className="d-flex align-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="type" value="lent" checked={formData.type === 'lent'} onChange={handleInputChange} /> 
                    <span style={{ color: 'var(--error)' }}>Given</span>
                  </label>
                  <label className="d-flex align-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="type" value="borrowed" checked={formData.type === 'borrowed'} onChange={handleInputChange} /> 
                    <span style={{ color: 'var(--success)' }}>Received</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Payee Name</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" name="payeeName" value={formData.payeeName || ''} onChange={handleInputChange} className="form-input" required placeholder="John Doe" style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={pickContact}
                    title="Pick from Contacts (Android Chrome)"
                    style={{ padding: '0.5rem 0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <FiUser size={16} /> Pick
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number (WhatsApp)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="tel" name="payeePhone" value={formData.payeePhone || ''} onChange={handleInputChange} className="form-input" placeholder="+91..." style={{ flex: 1 }} />
                  <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
                    <FiPhone size={16} />
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>Base Amount (₹)</label>
                <input type="number" step="0.01" name="amount" value={formData.amount || ''} onChange={handleInputChange} className="form-input" required placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Origination Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" required />
              </div>
            </div>

            <div className="form-group">
              <label>Note / Remarks</label>
              <textarea name="note" value={formData.note || ''} onChange={handleInputChange} className="form-input" rows={2} placeholder="Optional details..." />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn-primary">{editLoanId ? 'Save Changes' : 'Record Liability'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="loans-list mt-2">
        {loans === undefined ? (
          <p>Loading...</p>
        ) : loans.length === 0 ? (
          <div className="card glass-panel text-center py-8">
            <p className="text-muted">No loans recorded yet.</p>
          </div>
        ) : (
          loans.map(loan => {
            const totalRepaid = calculateEffectiveRepaid(loan);
            const remainingBalance = Math.max(0, loan.amount - totalRepaid);
            const progressPercent = Math.min(100, Math.round((totalRepaid / loan.amount) * 100));

            return (
              <div key={loan.id} className="loan-card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="loan-details">
                    {/* Clickable payee name → opens ledger */}
                    <button
                      className="loan-payee text-lg"
                      onClick={() => setSelectedPayee(loan.payeeName)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-600)', fontWeight: 600, padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
                      title="View full ledger for this person"
                    >
                      <FiBook size={14} /> {loan.payeeName}
                    </button>
                    <span className={`loan-amount ${loan.type}`}>
                      {loan.type === 'lent' ? '↓ Given: ' : '↑ Received: '} ₹{loan.amount.toLocaleString()}
                    </span>
                    <div className="loan-meta">
                      <span>{format(parseISO(loan.date.split('T')[0]), 'dd MMM yyyy')}</span>
                      {loan.payeePhone && <span>• {loan.payeePhone}</span>}
                      {loan.note && <span title={loan.note}>• {loan.note}</span>}
                    </div>
                  </div>

                  <div className="loan-actions">
                    {loan.status === 'pending' && (
                       <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} onClick={() => setActiveRepayLoanId(activeRepayLoanId === loan.id ? null : loan.id)}>
                         <FiDollarSign /> {loan.type === 'lent' ? 'Log Receipt' : 'Log Repayment'}
                       </button>
                    )}
                    <button 
                      className={`status-badge ${loan.status}`} 
                      onClick={() => toggleStatus(loan)}
                      title="Force Toggle Status"
                    >
                      {loan.status} {loan.status === 'settled' && <FiCheckCircle style={{marginBottom: '-2px'}} />}
                    </button>
                    
                    {loan.payeePhone && (
                      <button className="btn-whatsapp" onClick={() => sendWhatsApp(loan, remainingBalance)}>
                        <FiMessageCircle /> Send
                      </button>
                    )}
                    
                    <button className="btn-icon" onClick={() => startEdit(loan)} style={{ padding: '0.5rem' }} title="Edit Liability Info">
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon" onClick={() => deleteLoan(loan.id)} style={{ color: 'var(--error)', padding: '0.5rem' }} title="Delete Liability">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="loan-progress-container">
                  <div className="loan-progress-text">
                    <span>
                      {loan.status === 'settled' || remainingBalance === 0 ? 'Fully Settled' : `₹ ${remainingBalance.toLocaleString()} remaining`}
                    </span>
                    <span>{progressPercent}% Repaid</span>
                  </div>
                  <div className="loan-progress-bar">
                    <div className={`loan-progress-fill ${loan.status === 'settled' ? 'settled' : ''}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {/* Adding a Repayment Form */}
                {activeRepayLoanId === loan.id && (
                  <div className="repayment-form glass-panel p-3 border-radius mb-2" style={{ background: 'rgba(0,0,0,0.02)' }}>
                    <div className="d-flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                      <select name="type" className="form-input" style={{ width: '120px' }} value={repayForm.type || (loan.type === 'lent' ? 'received' : 'given')} onChange={handleRepayChange}>
                        <option value="received">Received</option>
                        <option value="given">Given</option>
                      </select>
                      <input type="date" name="date" className="form-input flex-1" value={repayForm.date} onChange={handleRepayChange} required />
                      <input type="number" name="amount" className="form-input flex-1" value={repayForm.amount} onChange={handleRepayChange} placeholder="Amount" style={{ minWidth: '100px' }} required />
                    </div>
                    <div className="d-flex gap-2">
                      <input type="text" name="note" className="form-input flex-1" value={repayForm.note} onChange={handleRepayChange} placeholder="Note..." />
                      <button className="btn-primary" onClick={() => submitRepayment(loan)}>Save</button>
                      {editRepaymentId && <button className="btn-secondary" onClick={() => { setEditRepaymentId(null); setActiveRepayLoanId(null); }}>Cancel</button>}
                    </div>
                  </div>
                )}

                {/* Repayment History List */}
                {loan.repayments && loan.repayments.length > 0 && (
                  <div className="repayment-history">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Payment History</h4>
                    {loan.repayments.map(rp => {
                      const rType = rp.type || (loan.type === 'lent' ? 'received' : 'given');
                      const typeLabel = rType === 'given' ? 'Given' : 'Received';
                      const colorClass = rType === 'received' ? 'text-success' : 'text-error';
                      return (
                        <div key={rp.id} className="repayment-item" style={{ flexWrap: 'wrap' }}>
                          <span className="date">{format(parseISO(rp.date), 'dd MMM yy')}</span>
                          <span className={`badge ${colorClass}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid', whiteSpace: 'nowrap' }}>{typeLabel}</span>
                          <span className="note" style={{ flex: 1, marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rp.note || 'Partial Payment'}</span>
                          <span className={`amount ${colorClass}`} style={{ whiteSpace: 'nowrap' }}>₹ {rp.amount.toLocaleString()}</span>
                          <div style={{ display: 'flex', gap: '0.2rem', marginLeft: 'auto' }}>
                            <button className="btn-icon" onClick={() => startEditRepayment(loan, rp)} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }}>
                              <FiEdit2 size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => deleteRepayment(loan, rp.id)} style={{ padding: '0.2rem 0.4rem', color: 'var(--error)' }}>
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Loans;
