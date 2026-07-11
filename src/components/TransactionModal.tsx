import React, { useState, useEffect } from 'react';
import { db, type Transaction } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { FiX } from 'react-icons/fi';
import './TransactionModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

const TransactionModal: React.FC<Props> = ({ isOpen, onClose, transactionToEdit }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentModeId, setPaymentModeId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useLiveQuery(() => db.categories.where('type').equals(type).toArray(), [type]);
  const paymentModes = useLiveQuery(() => db.paymentModes.toArray());

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setCategoryId(transactionToEdit.categoryId);
      setDate(transactionToEdit.date);
      setPaymentModeId(transactionToEdit.paymentModeId);
      setNote(transactionToEdit.note);
    } else {
      resetForm();
    }
  }, [transactionToEdit, isOpen]);

  // Set default values when data loads
  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    if (!paymentModeId && paymentModes && paymentModes.length > 0) {
      setPaymentModeId(paymentModes[0].id);
    }
  }, [categories, paymentModes, categoryId, paymentModeId]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setCategoryId(categories?.[0]?.id || '');
    setPaymentModeId(paymentModes?.[0]?.id || '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !categoryId || !paymentModeId || !date) return;

    setIsSubmitting(true);
    try {
      const transactionData = {
        type,
        amount: Number(amount),
        categoryId,
        date,
        paymentModeId,
        note,
        updatedAt: Date.now(),
      };

      if (transactionToEdit && transactionToEdit.id) {
        await db.transactions.update(transactionToEdit.id, transactionData);
      } else {
        await db.transactions.add({
          ...transactionData,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        });
      }
      handleClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2>{transactionToEdit ? 'Edit Cashflow' : 'New Cashflow'}</h2>
          <button className="close-btn" onClick={handleClose}><FiX size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group type-toggle">
            <button type="button" className={`toggle-btn ${type === 'expense' ? 'active-expense' : ''}`} onClick={() => setType('expense')}>Expense</button>
            <button type="button" className={`toggle-btn ${type === 'income' ? 'active-income' : ''}`} onClick={() => setType('income')}>Income</button>
          </div>

          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus className="form-input large-input" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
               <label>Payment Mode</label>
               <select required value={paymentModeId} onChange={e => setPaymentModeId(e.target.value)} className="form-input">
                 {paymentModes?.map(pm => (
                   <option key={pm.id} value={pm.id}>{pm.name}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="form-input">
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Note (Optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Enter details..." className="form-input" rows={2} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
