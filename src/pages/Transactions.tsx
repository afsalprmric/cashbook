import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '../db/database';
import TransactionModal from '../components/TransactionModal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';
import './Transactions.css';

const Transactions = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const transactions = useLiveQuery(() => db.transactions.reverse().sortBy('date'));
  const categories = useLiveQuery(async () => {
    const cats = await db.categories.toArray();
    return cats.reduce((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {} as Record<string, any>);
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await db.transactions.delete(id);
    }
  };

  const openNewModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const filteredTransactions = transactions?.filter(t => {
    let matchesSearch = true;
    if (searchTerm) {
      const catName = categories?.[t.categoryId]?.name?.toLowerCase() || '';
      const note = t.note?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();
      const dateStr = format(new Date(t.date), 'MMM dd, yyyy').toLowerCase();
      matchesSearch = catName.includes(term) || note.includes(term) || t.amount.toString().includes(term) || dateStr.includes(term);
    }
    
    let matchesCategory = true;
    if (filterCategory) {
      matchesCategory = t.categoryId === filterCategory;
    }

    return matchesSearch && matchesCategory;
  });

  const filteredIncome = filteredTransactions?.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0) || 0;
  const filteredExpense = filteredTransactions?.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0) || 0;

  return (
    <div className="transactions-page layout-content fade-in">
      <div className="page-header">
        <h2 className="page-title">Cashflow</h2>
        <button className="btn-primary d-flex align-center gap-2" onClick={openNewModal}>
          <FiPlus /> <span>Add Record</span>
        </button>
      </div>

      <div className="toolbar glass-panel mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
         <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
           <FiSearch className="search-icon" />
           <input 
             type="text" 
             placeholder="Search by date, amount, remarks..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="search-input"
             style={{ width: '100%' }}
           />
         </div>
         <select 
           className="form-input" 
           value={filterCategory} 
           onChange={e => setFilterCategory(e.target.value)}
           style={{ minWidth: '200px', backgroundColor: 'var(--surface)' }}
         >
           <option value="">All Categories</option>
           {categories && Object.values(categories).map((cat: any) => (
             <option key={cat.id} value={cat.id}>{cat.name}</option>
           ))}
         </select>
      </div>

      {filteredTransactions && (searchTerm || filterCategory) && (
        <div className="filter-summary glass-panel mb-4" style={{ display: 'flex', gap: '2rem', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Filtered Income: </span>
            <span className="text-success" style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{filteredIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Filtered Expense: </span>
            <span className="text-error" style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{filteredExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      <div className="transactions-list glass-panel">
        {filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="list-wrapper">
            {filteredTransactions.map(t => (
              <div key={t.id} className="transaction-item">
                <div className="tx-date-icon">
                  <div className={`tx-icon ${t.type === 'income' ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
                    {categories?.[t.categoryId]?.name?.[0]?.toUpperCase() || 'T'}
                  </div>
                  <div className="tx-details">
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{t.note || categories?.[t.categoryId]?.name || 'Unknown Category'}</h4>
                    <p className="tx-date-note">{format(new Date(t.date), 'MMM dd, yyyy')} • {categories?.[t.categoryId]?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                
                <div className="tx-actions-amount">
                  <span className={`tx-amount ${t.type === 'income' ? 'text-success' : 'text-error'}`}>
                    {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <div className="tx-actions">
                    <button className="icon-btn edit-btn" onClick={() => openEditModal(t)} title="Edit"><FiEdit2 /></button>
                    <button className="icon-btn delete-btn" onClick={() => t.id && handleDelete(t.id)} title="Delete"><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-muted">No transactions found.</p>
            <button className="btn-secondary mt-4" onClick={openNewModal}>Create your first entry</button>
          </div>
        )}
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        transactionToEdit={editingTransaction}
      />
    </div>
  );
};

export default Transactions;
