import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CreditCard, type EMI, type EMIPayment } from '../db/database';
import { FiPlus, FiTrash2, FiCreditCard, FiCalendar, FiDollarSign, FiEdit2 } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import './CreditCards.css';

const CreditCards = () => {
  const [activeTab, setActiveTab] = useState<'cards' | 'emis'>('cards');
  
  // Card States
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState<Partial<CreditCard>>({});
  const [activeEditCardId, setActiveEditCardId] = useState<string | null>(null);
  const [updateAmount, setUpdateAmount] = useState('');

  // EMI States
  const [showAddEmi, setShowAddEmi] = useState(false);
  const [emiForm, setEmiForm] = useState<Partial<EMI>>({
    startDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeEditEmiId, setActiveEditEmiId] = useState<string | null>(null);
  const [editEmiPaymentId, setEditEmiPaymentId] = useState<string | null>(null);
  const [emiPayForm, setEmiPayForm] = useState<{ amount: string, date: string, note: string }>({ amount: '', date: '', note: '' });
  const [activeEditMainEmiId, setActiveEditMainEmiId] = useState<string | null>(null);

  const cards = useLiveQuery(() => db.creditCards.toArray());
  const emis = useLiveQuery(() => db.emis.toArray().then(arr => arr.sort((a, b) => b.createdAt - a.createdAt)));

  // --- Handlers for Credit Cards ---
  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardForm(prev => ({
      ...prev,
      [name]: (name === 'creditLimit' || name === 'currentOutstanding' || name === 'statementDay' || name === 'dueDay') 
              ? Number(value) 
              : value
    }));
  };

  const submitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name || !cardForm.bankName || !cardForm.creditLimit) return;

    const newCard: CreditCard = {
      id: uuidv4(),
      name: cardForm.name,
      bankName: cardForm.bankName,
      creditLimit: Number(cardForm.creditLimit),
      currentOutstanding: Number(cardForm.currentOutstanding) || 0,
      statementDay: Number(cardForm.statementDay) || 1,
      dueDay: Number(cardForm.dueDay) || 15,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.creditCards.add(newCard);
    setShowAddCard(false);
    setCardForm({});
  };

  const deleteCard = async (id: string) => {
    if (window.confirm("Delete this credit card? Note: Linked EMIs will not be deleted but link will be lost.")) {
      await db.creditCards.delete(id);
    }
  };

  const saveOutstanding = async (cardId: string) => {
    if (!updateAmount) return;
    await db.creditCards.update(cardId, {
      currentOutstanding: Number(updateAmount),
      updatedAt: Date.now()
    });
    setActiveEditCardId(null);
    setUpdateAmount('');
  };


  // --- Handlers for EMIs ---
  const handleEmiInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmiForm(prev => ({
      ...prev,
      [name]: (name === 'emiAmount' || name === 'totalMonths' || name === 'monthsPaid') 
              ? Number(value) 
              : value
    }));
  };

  const submitEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emiForm.itemName || !emiForm.emiAmount || !emiForm.totalMonths) return;

    if (activeEditMainEmiId) {
      const isCompleted = (Number(emiForm.monthsPaid) >= Number(emiForm.totalMonths));
      await db.emis.update(activeEditMainEmiId, {
        itemName: emiForm.itemName,
        emiAmount: Number(emiForm.emiAmount),
        totalMonths: Number(emiForm.totalMonths),
        monthsPaid: Number(emiForm.monthsPaid) || 0,
        startDate: emiForm.startDate || new Date().toISOString(),
        linkedCardId: emiForm.linkedCardId || undefined,
        status: isCompleted ? 'completed' : 'active',
        updatedAt: Date.now()
      });
    } else {
      const newEmi: EMI = {
        id: uuidv4(),
        itemName: emiForm.itemName,
        emiAmount: Number(emiForm.emiAmount),
        totalMonths: Number(emiForm.totalMonths),
        monthsPaid: Number(emiForm.monthsPaid) || 0,
        startDate: emiForm.startDate || new Date().toISOString(),
        linkedCardId: emiForm.linkedCardId || undefined,
        status: (Number(emiForm.monthsPaid) >= Number(emiForm.totalMonths)) ? 'completed' : 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.emis.add(newEmi);
    }

    setShowAddEmi(false);
    setActiveEditMainEmiId(null);
    setEmiForm({ startDate: format(new Date(), 'yyyy-MM-dd') });
  };

  const payEmiInstallment = async (emi: EMI) => {
    if (!window.confirm(`Confirm logging EMI payment of ₹${emi.emiAmount.toLocaleString()} for ${emi.itemName}?`)) return;

    const newPayment: EMIPayment = {
      id: uuidv4(),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: emi.emiAmount,
      note: 'Auto-logged'
    };

    const newMonthsPaid = emi.monthsPaid + 1;
    const isCompleted = newMonthsPaid >= emi.totalMonths;
    const updatedPayments = [...(emi.payments || []), newPayment];

    await db.emis.update(emi.id, {
      monthsPaid: newMonthsPaid,
      payments: updatedPayments,
      status: isCompleted ? 'completed' : 'active',
      updatedAt: Date.now()
    });
  };

  const startEditEmiPayment = (emi: EMI, p: EMIPayment) => {
    setActiveEditEmiId(emi.id);
    setEditEmiPaymentId(p.id);
    setEmiPayForm({
      amount: p.amount.toString(),
      date: p.date,
      note: p.note
    });
  };

  const submitEmiPaymentEdit = async (emi: EMI) => {
    if (!editEmiPaymentId) return;
    const updatedPayments = (emi.payments || []).map(p => 
      p.id === editEmiPaymentId ? { ...p, amount: Number(emiPayForm.amount), date: emiPayForm.date, note: emiPayForm.note } : p
    );

    await db.emis.update(emi.id, {
      payments: updatedPayments,
      updatedAt: Date.now()
    });
    setEditEmiPaymentId(null);
    setActiveEditEmiId(null);
  };

  const deleteEmiPayment = async (emi: EMI, paymentId: string) => {
    if (!window.confirm("Delete this EMI payment log? This will decrement the months paid counter.")) return;
    const updatedPayments = (emi.payments || []).filter(p => p.id !== paymentId);
    const newMonthsPaid = emi.monthsPaid - 1;
    const isCompleted = newMonthsPaid >= emi.totalMonths;

    await db.emis.update(emi.id, {
      payments: updatedPayments,
      monthsPaid: newMonthsPaid >= 0 ? newMonthsPaid : 0,
      status: isCompleted ? 'completed' : 'active',
      updatedAt: Date.now()
    });
  };

  const deleteEmi = async (id: string) => {
    if (window.confirm("Delete this EMI tracking record?")) {
      await db.emis.delete(id);
    }
  };

  const startEditMainEmi = (emi: EMI) => {
    setActiveEditMainEmiId(emi.id);
    setEmiForm({
      itemName: emi.itemName,
      emiAmount: emi.emiAmount,
      totalMonths: emi.totalMonths,
      monthsPaid: emi.monthsPaid,
      startDate: emi.startDate.split('T')[0],
      linkedCardId: emi.linkedCardId || ''
    });
    setShowAddEmi(true);
    window.scrollTo(0, 0);
  };


  return (
    <div className="credit-cards-page layout-content fade-in">
      <div className="d-flex align-center justify-between flex-wrap" style={{ gap: '1rem' }}>
        <h2 className="page-title mb-0">Cards & EMIs</h2>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Credit Cards
        </button>
        <button 
          className={`tab-btn ${activeTab === 'emis' ? 'active' : ''}`}
          onClick={() => setActiveTab('emis')}
        >
          Active EMIs
        </button>
      </div>

      {activeTab === 'cards' && (
        <div className="tab-pane fade-in">
          <div className="d-flex justify-between mb-4">
            <h3 className="text-lg">Your Credit Cards</h3>
            <button className="btn-primary d-flex align-center gap-2" onClick={() => setShowAddCard(!showAddCard)}>
              <FiPlus /> {showAddCard ? 'Cancel' : 'Add Card'}
            </button>
          </div>

          {showAddCard && (
            <div className="card glass-panel fade-in mb-4 border-primary">
              <form onSubmit={submitCard} className="d-flex flex-column gap-3">
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input type="text" name="bankName" value={cardForm.bankName || ''} onChange={handleCardInputChange} className="form-input" placeholder="e.g. HDFC" required />
                  </div>
                  <div className="form-group">
                    <label>Card Name (Variant)</label>
                    <input type="text" name="name" value={cardForm.name || ''} onChange={handleCardInputChange} className="form-input" placeholder="e.g. Millennia" required />
                  </div>
                  <div className="form-group">
                    <label>Credit Limit (₹)</label>
                    <input type="number" name="creditLimit" value={cardForm.creditLimit || ''} onChange={handleCardInputChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Current Outstanding (₹)</label>
                    <input type="number" name="currentOutstanding" value={cardForm.currentOutstanding || ''} onChange={handleCardInputChange} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Statement Day (1-31)</label>
                    <input type="number" min="1" max="31" name="statementDay" value={cardForm.statementDay || ''} onChange={handleCardInputChange} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Due Day (1-31)</label>
                    <input type="number" min="1" max="31" name="dueDay" value={cardForm.dueDay || ''} onChange={handleCardInputChange} className="form-input" />
                  </div>
                </div>
                <button type="submit" className="btn-primary align-self-start mt-2">Save Card</button>
              </form>
            </div>
          )}

          <div className="cards-grid">
            {cards === undefined ? <p>Loading...</p> : cards.length === 0 ? <p className="text-muted">No credit cards added.</p> : (
              cards.map(card => {
                const utilPercent = Math.min(100, Math.round((card.currentOutstanding / card.creditLimit) * 100));
                let progressClass = '';
                if (utilPercent > 80) progressClass = 'max-utilization';
                else if (utilPercent > 50) progressClass = 'high-utilization';

                const availableLimit = Math.max(0, card.creditLimit - card.currentOutstanding);

                return (
                  <div key={card.id} className="credit-card-item glass-panel">
                    <div className="card-header">
                      <div>
                        <div className="bank-name">{card.bankName}</div>
                        <div className="card-name">{card.name}</div>
                      </div>
                      <FiCreditCard size={24} color="var(--text-muted)" />
                    </div>

                    <div className="limit-info">
                      <div className="limit-row">
                        <span className="text-secondary">Outstanding</span>
                        <span className="text-error font-medium">₹{card.currentOutstanding.toLocaleString()}</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className={`progress-fill ${progressClass}`} style={{ width: `${utilPercent}%` }}></div>
                      </div>
                      <div className="limit-row" style={{ fontSize: '0.85rem' }}>
                        <span className="text-muted">Available: ₹{availableLimit.toLocaleString()}</span>
                        <span className="text-muted">Limit: ₹{card.creditLimit.toLocaleString()}</span>
                      </div>
                    </div>

                    {activeEditCardId === card.id ? (
                      <div className="update-outstanding-form">
                        <input type="number" className="form-input" placeholder="New Outstanding" value={updateAmount} onChange={(e) => setUpdateAmount(e.target.value)} />
                        <button className="btn-primary" onClick={() => saveOutstanding(card.id)}>Save</button>
                        <button className="btn-secondary" onClick={() => setActiveEditCardId(null)}>X</button>
                      </div>
                    ) : (
                      <button className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.85rem', width: 'fit-content' }} onClick={() => { setActiveEditCardId(card.id); setUpdateAmount(card.currentOutstanding.toString()); }}>
                        <FiDollarSign style={{ display: 'inline', marginBottom: '-2px' }}/> Update Outstanding
                      </button>
                    )}

                    <div className="dates-info">
                      <span>Statement: {card.statementDay}th</span>
                      <span>Due: {card.dueDay}th</span>
                    </div>

                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => deleteCard(card.id)} style={{ color: 'var(--error)' }}><FiTrash2 /></button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}


      {activeTab === 'emis' && (
        <div className="tab-pane fade-in">
          <div className="d-flex justify-between mb-4">
            <h3 className="text-lg">Your EMI Trackers</h3>
            <button className="btn-primary d-flex align-center gap-2" onClick={() => {
              setShowAddEmi(!showAddEmi);
              if (activeEditMainEmiId) setActiveEditMainEmiId(null);
              setEmiForm({ startDate: format(new Date(), 'yyyy-MM-dd') });
            }}>
              <FiPlus /> {showAddEmi || activeEditMainEmiId ? 'Cancel' : 'New EMI'}
            </button>
          </div>

          {(showAddEmi || activeEditMainEmiId) && (
            <div className="card glass-panel fade-in mb-4 border-primary">
              <h3 className="mb-4">{activeEditMainEmiId ? 'Edit EMI Tracker' : 'Add New EMI'}</h3>
              <form onSubmit={submitEmi} className="d-flex flex-column gap-3">
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input type="text" name="itemName" value={emiForm.itemName || ''} onChange={handleEmiInputChange} className="form-input" placeholder="e.g. iPhone 15" required />
                  </div>
                  <div className="form-group">
                    <label>EMI Amount (₹ / month)</label>
                    <input type="number" name="emiAmount" value={emiForm.emiAmount || ''} onChange={handleEmiInputChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Total Duration (Months)</label>
                    <input type="number" name="totalMonths" value={emiForm.totalMonths || ''} onChange={handleEmiInputChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Months Already Paid (Optional)</label>
                    <input type="number" name="monthsPaid" value={emiForm.monthsPaid || ''} onChange={handleEmiInputChange} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" value={emiForm.startDate || ''} onChange={handleEmiInputChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Linked Credit Card (Optional)</label>
                    <select name="linkedCardId" value={emiForm.linkedCardId || ''} onChange={handleEmiInputChange} className="form-input">
                      <option value="">-- None --</option>
                      {cards?.map(c => <option key={c.id} value={c.id}>{c.bankName} - {c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary align-self-start mt-2">{activeEditMainEmiId ? 'Save Changes' : 'Save EMI'}</button>
              </form>
            </div>
          )}

          <div className="cards-grid">
            {emis === undefined ? <p>Loading...</p> : emis.length === 0 ? <p className="text-muted">No EMIs running right now.</p> : (
              emis.map(emi => {
                const progressPercent = Math.min(100, (emi.monthsPaid / emi.totalMonths) * 100);
                const isCompleted = emi.status === 'completed';
                
                return (
                  <div key={emi.id} className={`emi-item glass-panel ${isCompleted ? 'border-success' : ''}`}>
                    <div className="emi-header">
                      <div className="emi-item-name">{emi.itemName}</div>
                      {isCompleted && <span className="status-badge settled">Completed</span>}
                    </div>

                    <div className="emi-amount">
                      ₹{emi.emiAmount.toLocaleString()} <span className="text-muted" style={{fontSize: '0.85rem', fontWeight: 'normal'}}>/ month</span>
                    </div>

                    <div className="emi-progress">
                      <div className="emi-months">
                        <span>{emi.monthsPaid} Months Paid</span>
                        <span>{emi.totalMonths} Total</span>
                      </div>
                      <div className="emi-progress-bar">
                        <div className="emi-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>

                    <div className="d-flex justify-between align-center mt-2">
                       <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                         <FiCalendar style={{ display: 'inline', marginBottom: '-2px', marginRight: '4px' }}/> 
                         Started: {format(new Date(emi.startDate), 'MMM yyyy')}
                       </div>
                       
                       <div className="d-flex gap-2">
                          {!isCompleted && (
                            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => payEmiInstallment(emi)}>
                              Log EMI Paid
                            </button>
                          )}
                          <button className="btn-icon" onClick={() => startEditMainEmi(emi)} style={{ padding: '0.5rem' }} title="Edit Tracker">
                            <FiEdit2 />
                          </button>
                          <button className="btn-icon" onClick={() => deleteEmi(emi.id)} style={{ color: 'var(--error)', padding: '0.5rem' }} title="Delete Tracker">
                            <FiTrash2 />
                          </button>
                       </div>
                    </div>

                    {emi.payments && emi.payments.length > 0 && (
                      <div className="repayment-history mt-3">
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Payment Logs</h4>
                        {emi.payments.map(p => (
                          <div key={p.id} className="repayment-item" style={{ flexWrap: 'wrap' }}>
                            <span className="date">{format(new Date(p.date), 'dd MMM yy')}</span>
                            <span className="note" style={{ flex: 1, marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note}</span>
                            <span className="amount text-primary" style={{ whiteSpace: 'nowrap' }}>₹ {p.amount.toLocaleString()}</span>
                            <div style={{ display: 'flex', gap: '0.2rem', marginLeft: 'auto' }}>
                              <button className="btn-icon" onClick={() => startEditEmiPayment(emi, p)} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }}>
                                <FiEdit2 size={14} />
                              </button>
                              <button className="btn-icon" onClick={() => deleteEmiPayment(emi, p.id)} style={{ padding: '0.2rem 0.4rem', color: 'var(--error)' }}>
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {activeEditEmiId === emi.id && editEmiPaymentId && (
                      <div className="repayment-form glass-panel p-3 border-radius mb-2 mt-2" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <div className="d-flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                          <input type="date" className="form-input flex-1" value={emiPayForm.date} onChange={e => setEmiPayForm({...emiPayForm, date: e.target.value})} required />
                          <input type="number" className="form-input flex-1" value={emiPayForm.amount} onChange={e => setEmiPayForm({...emiPayForm, amount: e.target.value})} placeholder="Amount" required />
                        </div>
                        <div className="d-flex gap-2">
                          <input type="text" className="form-input flex-1" value={emiPayForm.note} onChange={e => setEmiPayForm({...emiPayForm, note: e.target.value})} placeholder="Note..." />
                          <button className="btn-primary" onClick={() => submitEmiPaymentEdit(emi)}>Save</button>
                          <button className="btn-secondary" onClick={() => { setEditEmiPaymentId(null); setActiveEditEmiId(null); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCards;
