import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Investment } from '../db/database';
import { FiPlus, FiTrash2, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import './Investments.css';

const Investments = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Investment>>({
    type: 'investment',
    status: 'active',
    startDate: format(new Date(), 'yyyy-MM-dd')
  });

  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [updateVal, setUpdateVal] = useState<string>('');

  const investments = useLiveQuery(() => db.investments.orderBy('startDate').reverse().toArray());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'amountInvested' || name === 'currentValue') ? (parseFloat(value) || '') : value
    }));
  };

  const startEdit = (inv: Investment) => {
    setEditId(inv.id);
    setFormData({
      name: inv.name,
      type: inv.type,
      amountInvested: inv.amountInvested,
      currentValue: inv.currentValue,
      startDate: inv.startDate.split('T')[0],
      maturityDate: inv.maturityDate ? inv.maturityDate.split('T')[0] : '',
      status: inv.status,
      note: inv.note
    });
    setShowAddForm(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amountInvested) return alert("Name and Amount Invested are required.");

    const amount = Number(formData.amountInvested);
    const cValue = formData.currentValue ? Number(formData.currentValue) : amount;

    if (editId) {
      await db.investments.update(editId, {
        name: formData.name,
        type: formData.type as 'savings' | 'investment',
        amountInvested: amount,
        currentValue: cValue,
        startDate: formData.startDate || new Date().toISOString(),
        maturityDate: formData.maturityDate || undefined,
        status: formData.status as 'active' | 'closed',
        note: formData.note || '',
        updatedAt: Date.now()
      });
    } else {
      const newInv: Investment = {
        id: uuidv4(),
        name: formData.name,
        type: formData.type as 'savings' | 'investment',
        amountInvested: amount,
        currentValue: cValue,
        startDate: formData.startDate || new Date().toISOString(),
        maturityDate: formData.maturityDate || undefined,
        status: formData.status as 'active' | 'closed',
        note: formData.note || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.investments.add(newInv);
    }

    setShowAddForm(false);
    setEditId(null);
    setFormData({ type: 'investment', status: 'active', startDate: format(new Date(), 'yyyy-MM-dd') });
  };

  const saveUpdatedValue = async (inv: Investment) => {
    if (!updateVal) return;
    await db.investments.update(inv.id, {
      currentValue: parseFloat(updateVal),
      updatedAt: Date.now()
    });
    setActiveUpdateId(null);
    setUpdateVal('');
  };

  const toggleStatus = async (inv: Investment) => {
    const newStatus = inv.status === 'active' ? 'closed' : 'active';
    await db.investments.update(inv.id, { status: newStatus, updatedAt: Date.now() });
  };

  const deleteInv = async (id: string) => {
    if (window.confirm("Delete this overall record permanently?")) {
      await db.investments.delete(id);
    }
  };

  // Dashboard calculations
  const { totalInvested, totalCurrentValue, absoluteReturn, percentReturn } = useMemo(() => {
    if (!investments) return { totalInvested: 0, totalCurrentValue: 0, absoluteReturn: 0, percentReturn: 0 };
    let tInv = 0;
    let tCur = 0;
    investments.forEach(inv => {
      if (inv.status === 'active') { // only tally active for realistic nav? Let's tally all active
        tInv += inv.amountInvested;
        tCur += inv.currentValue;
      }
    });

    const absRet = tCur - tInv;
    const pctRet = tInv > 0 ? (absRet / tInv) * 100 : 0;
    return { totalInvested: tInv, totalCurrentValue: tCur, absoluteReturn: absRet, percentReturn: pctRet };
  }, [investments]);

  return (
    <div className="investments-page layout-content fade-in">
      
      <div className="d-flex align-center justify-between flex-wrap" style={{ gap: '1rem' }}>
        <h2 className="page-title mb-0">Savings & Investments</h2>
        <button className="btn-primary d-flex align-center gap-2" onClick={() => {
          setShowAddForm(!showAddForm);
          if (editId) setEditId(null);
          setFormData({ type: 'investment', status: 'active', startDate: format(new Date(), 'yyyy-MM-dd') });
        }}>
          <FiPlus /> {showAddForm || editId ? 'Cancel' : 'Add New'}
        </button>
      </div>

      <div className="investment-dash">
        <div className="investment-stat">
          <h4>Total Active Invested</h4>
          <span className="val">₹ {totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
        </div>
        <div className="investment-stat">
          <h4>Current Portfolio Value</h4>
          <span className="val text-primary">₹ {totalCurrentValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
        </div>
        <div className="investment-stat">
          <h4>Overall Returns</h4>
          <span className={`val ${absoluteReturn > 0 ? 'text-success' : absoluteReturn < 0 ? 'text-error' : ''}`}>
            {absoluteReturn > 0 ? '+' : ''}₹ {absoluteReturn.toLocaleString('en-IN', {minimumFractionDigits: 2})} ({absoluteReturn > 0 ? '+' : ''}{percentReturn.toFixed(2)}%)
          </span>
        </div>
      </div>

      {(showAddForm || editId) && (
        <div className="card glass-panel fade-in mt-2 border-primary">
          <h3 className="mb-4">{editId ? 'Edit Record' : 'Log New Asset'}</h3>
          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ gap: '1.5rem' }}>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Type of Asset</label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label className="d-flex align-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="type" value="investment" checked={formData.type === 'investment'} onChange={handleInputChange} /> 
                    <span>Market Investment (Stocks, MFs)</span>
                  </label>
                  <label className="d-flex align-center gap-2" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="type" value="savings" checked={formData.type === 'savings'} onChange={handleInputChange} /> 
                    <span>Bank Savings / FDs</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Asset Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="form-input" required placeholder="HDFC Mutual Fund" />
              </div>
              <div className="form-group">
                <label>Amount Invested / Principal (₹)</label>
                <input type="number" step="0.01" name="amountInvested" value={formData.amountInvested || ''} onChange={handleInputChange} className="form-input" required placeholder="50000" />
              </div>
              <div className="form-group">
                <label>Current Value (₹) (Optional)</label>
                <input type="number" step="0.01" name="currentValue" value={formData.currentValue || ''} onChange={handleInputChange} className="form-input" placeholder="Leaves equal to Principal if blank" />
              </div>
              <div className="form-group">
                <label>Start / Deposit Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Maturity Date (Optional)</label>
                <input type="date" name="maturityDate" value={formData.maturityDate || ''} onChange={handleInputChange} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <input type="text" name="note" value={formData.note || ''} onChange={handleInputChange} className="form-input" placeholder="Account numbers, holding details..." />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn-primary">{editId ? 'Save Changes' : 'Save Asset'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-4">
        {investments === undefined ? (
          <p>Loading portfolio...</p>
        ) : investments.length === 0 ? (
          <div className="card glass-panel text-center py-8">
            <p className="text-muted">No savings or investments logged tracking yet.</p>
          </div>
        ) : (
          investments.map(inv => {
            const ret = inv.currentValue - inv.amountInvested;
            const pct = inv.amountInvested > 0 ? (ret / inv.amountInvested) * 100 : 0;
            const isProfit = ret > 0;
            const isLoss = ret < 0;

            return (
              <div key={inv.id} className="investment-card fade-in">
                <div className="inv-header">
                  <div className="d-flex align-center gap-2">
                    <span className="inv-name">{inv.name}</span>
                    <span className="inv-type">{inv.type}</span>
                  </div>
                  <div>
                    <button className={`status-badge ${inv.status === 'active' ? 'pending' : 'settled'}`} onClick={() => toggleStatus(inv)} style={{ border: 'none', cursor: 'pointer' }} title="Toggle Active/Closed Status">
                      {inv.status} {inv.status === 'closed' && <FiCheckCircle style={{marginBottom: '-2px'}} />}
                    </button>
                  </div>
                </div>

                <div className="inv-body mt-2">
                  <div className="inv-detail">
                    <span className="inv-label">Invested / Principal</span>
                    <span className="inv-val">₹ {inv.amountInvested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="inv-detail">
                    <span className="inv-label">Current Value</span>
                    <span className="inv-val text-primary d-flex align-center gap-2">
                      ₹ {inv.currentValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>

                <div className="inv-footer">
                  <div className="d-flex align-center gap-3">
                    <span className={`return-badge ${isProfit ? 'profit' : isLoss ? 'loss' : 'neutral'}`}>
                      {isProfit ? '+' : ''}₹ {ret.toLocaleString('en-IN', {minimumFractionDigits: 2})} ({isProfit ? '+' : ''}{pct.toFixed(2)}%)
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Started: {format(parseISO(inv.startDate.split('T')[0]), 'dd MMM yy')}</span>
                    {inv.maturityDate && <span className="text-muted" style={{ fontSize: '0.8rem' }}>• Matures: {format(parseISO(inv.maturityDate.split('T')[0]), 'dd MMM yy')}</span>}
                  </div>

                  <div className="d-flex align-center gap-2">
                    {activeUpdateId === inv.id ? (
                      <div className="update-val-form">
                        <input type="number" step="0.01" className="form-input" placeholder="New Value" value={updateVal} onChange={(e) => setUpdateVal(e.target.value)} autoFocus />
                        <button className="btn-primary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => saveUpdatedValue(inv)}>Save</button>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setActiveUpdateId(null)}>X</button>
                      </div>
                    ) : (
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={() => { setActiveUpdateId(inv.id); setUpdateVal(inv.currentValue.toString()); }}>
                         Update Value
                      </button>
                    )}
                    
                    <button className="btn-icon" onClick={() => startEdit(inv)} style={{ padding: '0.5rem' }} title="Edit"><FiEdit2 /></button>
                    <button className="btn-icon text-error" onClick={() => deleteInv(inv.id)} style={{ padding: '0.5rem' }} title="Delete"><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Investments;
