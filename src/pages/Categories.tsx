import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '../db/database';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import './Categories.css';

const Categories = () => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income'|'expense'>('expense');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  const categories = useLiveQuery(() => db.categories.toArray());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    await db.categories.add({
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      type: newCatType,
      isDefault: false
    });
    setNewCatName('');
  };

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEdit = async () => {
    if (editingCatId && editingCatName.trim()) {
      await db.categories.update(editingCatId, { name: editingCatName.trim() });
    }
    setEditingCatId(null);
  };

  const handleDelete = async (id: string, isDefault?: boolean) => {
    if (isDefault) {
      alert("Cannot delete default categories.");
      return;
    }
    if (window.confirm('Delete this category? Cashflow entries using it will remain but may show as Unknown.')) {
      await db.categories.delete(id);
    }
  };

  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  const renderCategoryList = (list: Category[], type: 'Income'|'Expense') => (
    <div className={`category-section ${type.toLowerCase()}-section`}>
      <h3 className="section-title">{type} Categories</h3>
      <div className="category-list glass-panel">
        {list.map(cat => (
          <div key={cat.id} className="category-item">
            {editingCatId === cat.id ? (
              <div className="edit-inline">
                <input 
                  type="text" 
                  value={editingCatName}
                  onChange={e => setEditingCatName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
                <button className="icon-btn text-success" onClick={saveEdit}><FiSave /></button>
                <button className="icon-btn" onClick={() => setEditingCatId(null)}><FiX /></button>
              </div>
            ) : (
              <>
                <div className="cat-name">
                  <span className={`dot bg-${type === 'Income' ? 'success' : 'error'}`}></span>
                  {cat.name}
                  {cat.isDefault && <span className="badge">Default</span>}
                </div>
                <div className="cat-actions">
                  <button className="icon-btn edit-btn" onClick={() => startEdit(cat)}><FiEdit2 /></button>
                  {!cat.isDefault && (
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(cat.id, cat.isDefault)}><FiTrash2 /></button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-muted text-center p-4">No categories found.</p>}
      </div>
    </div>
  );

  return (
    <div className="categories-page layout-content fade-in">
      <h2 className="page-title">Category Management</h2>
      
      <form className="add-category-form glass-panel mb-6" onSubmit={handleCreate}>
        <h3>Add New Category / Ledger Head</h3>
        <div className="form-group-row mt-4">
           <input 
             type="text" 
             placeholder="Category Name" 
             required
             value={newCatName}
             onChange={e => setNewCatName(e.target.value)}
             className="form-input flex-1"
           />
           <select 
             value={newCatType} 
             onChange={e => setNewCatType(e.target.value as 'income'|'expense')}
             className="form-input"
           >
             <option value="expense">Expense</option>
             <option value="income">Income</option>
           </select>
           <button type="submit" className="btn-primary d-flex align-center gap-2">
             <FiPlus /> Add
           </button>
        </div>
      </form>

      <div className="categories-grid">
        {renderCategoryList(expenseCategories, 'Expense')}
        {renderCategoryList(incomeCategories, 'Income')}
      </div>
    </div>
  );
};

export default Categories;
