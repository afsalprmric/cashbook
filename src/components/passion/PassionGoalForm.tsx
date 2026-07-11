import React, { useState, useEffect } from 'react';
import type { Category } from '../../db/database';
import type { PassionGoal } from '../../types/passion';
import { FiSave, FiX, FiAward } from 'react-icons/fi';
import { format } from 'date-fns';

interface PassionGoalFormProps {
  categories: Category[];
  initialGoal?: PassionGoal | null;
  onSave: (goal: Omit<PassionGoal, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const PassionGoalForm: React.FC<PassionGoalFormProps> = ({
  categories,
  initialGoal,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [currentSaved, setCurrentSaved] = useState<number | ''>('');
  const [desiredDate, setDesiredDate] = useState('');
  const [isTargetFlexible, setIsTargetFlexible] = useState(true);
  const [importance, setImportance] = useState<'important' | 'very_important' | 'life_goal'>('important');
  const [flexibleCategoryIds, setFlexibleCategoryIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed default date 6 months out
  useEffect(() => {
    if (initialGoal) {
      setName(initialGoal.name);
      setDescription(initialGoal.description);
      setReason(initialGoal.reason);
      setTargetAmount(initialGoal.targetAmount);
      setCurrentSaved(initialGoal.currentSaved);
      setDesiredDate(initialGoal.desiredDate);
      setIsTargetFlexible(initialGoal.isTargetFlexible);
      setImportance(initialGoal.importance);
      setFlexibleCategoryIds(initialGoal.flexibleCategoryIds || []);
    } else {
      const sixMonthsOut = format(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      setDesiredDate(sixMonthsOut);
      setTargetAmount('');
      setCurrentSaved('');
      setName('');
      setDescription('');
      setReason('');
      setIsTargetFlexible(true);
      setImportance('important');
      setFlexibleCategoryIds([]);
    }
    setErrors({});
  }, [initialGoal]);

  const handleCategoryToggle = (catId: string) => {
    setFlexibleCategoryIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Goal name is required';
    if (!reason.trim()) newErrors.reason = 'Motivation (why this matters) is required';
    
    if (targetAmount === '' || Number(targetAmount) <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than zero';
    }
    
    if (currentSaved === '' || Number(currentSaved) < 0) {
      newErrors.currentSaved = 'Current savings cannot be negative';
    } else if (targetAmount !== '' && Number(currentSaved) > Number(targetAmount)) {
      newErrors.currentSaved = 'Savings cannot exceed target amount';
    }

    if (!desiredDate) {
      newErrors.desiredDate = 'Target completion date is required';
    } else {
      const selected = new Date(desiredDate).getTime();
      const today = new Date(new Date().setHours(0,0,0,0)).getTime();
      // Allow past dates only if editing initialGoal to be safe with pre-existing datasets
      if (selected < today && !initialGoal) {
        newErrors.desiredDate = 'Desired date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      id: initialGoal?.id,
      name: name.trim(),
      description: description.trim(),
      reason: reason.trim(),
      targetAmount: Number(targetAmount),
      currentSaved: Number(currentSaved),
      desiredDate,
      isTargetFlexible,
      importance,
      flexibleCategoryIds
    });
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="passion-form-container glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div className="d-flex align-center gap-2 mb-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.8rem' }}>
        <FiAward size={22} style={{ color: '#0f766e' }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{initialGoal ? 'Edit Passion Goal' : 'Define Your Passion Goal'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <label className="form-label" htmlFor="goal-name">What is your dream or passion goal?</label>
          <input
            id="goal-name"
            type="text"
            className="form-control"
            placeholder="e.g. Build a home recording studio, Buy camera gear, Side project..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
          {errors.name && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.name}</span>}
        </div>

        <div className="row">
          <div className="col-md-6 form-group mb-3">
            <label className="form-label" htmlFor="target-amount">Target Amount (INR)</label>
            <input
              id="target-amount"
              type="number"
              min="1"
              className="form-control"
              placeholder="e.g. 60000"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
            {errors.targetAmount && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.targetAmount}</span>}
          </div>

          <div className="col-md-6 form-group mb-3">
            <label className="form-label" htmlFor="current-saved">Current Savings Allocated (INR)</label>
            <input
              id="current-saved"
              type="number"
              min="0"
              className="form-control"
              placeholder="e.g. 8000"
              value={currentSaved}
              onChange={e => setCurrentSaved(e.target.value === '' ? '' : Number(e.target.value))}
            />
            {errors.currentSaved && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.currentSaved}</span>}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 form-group mb-3">
            <label className="form-label" htmlFor="desired-date">Desired Completion Date</label>
            <input
              id="desired-date"
              type="date"
              className="form-control"
              value={desiredDate}
              onChange={e => setDesiredDate(e.target.value)}
            />
            {errors.desiredDate && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.desiredDate}</span>}
          </div>

          <div className="col-md-6 form-group mb-3">
            <label className="form-label" htmlFor="importance">Goal Priority</label>
            <select
              id="importance"
              className="form-control"
              value={importance}
              onChange={e => setImportance(e.target.value as any)}
            >
              <option value="important">Important (Lifestyle/Hobby)</option>
              <option value="very_important">Very Important (Career/Major Project)</option>
              <option value="life_goal">Life Goal (Pillars of Personal Growth)</option>
            </select>
          </div>
        </div>

        <div className="form-group mb-3">
          <label className="form-label" htmlFor="goal-description">Describe the dream (Optional)</label>
          <textarea
            id="goal-description"
            className="form-control"
            rows={2}
            placeholder="Add details about the specifications, tools, or elements of this goal..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group mb-3">
          <label className="form-label" htmlFor="goal-reason">Why does this dream matter to you? (Motivation)</label>
          <textarea
            id="goal-reason"
            className="form-control"
            rows={2}
            placeholder="e.g. I want to build a career in education; I want to publish my first book to share ideas..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          {errors.reason && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.reason}</span>}
        </div>

        <div className="form-group mb-3">
          <div className="d-flex align-center gap-2">
            <input
              id="is-flexible"
              type="checkbox"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              checked={isTargetFlexible}
              onChange={e => setIsTargetFlexible(e.target.checked)}
            />
            <label htmlFor="is-flexible" style={{ margin: 0, cursor: 'pointer', fontSize: '0.925rem' }}>
              Target timeline or amount is flexible (AI can suggest alternative parameters)
            </label>
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Which spending categories can you potentially adjust? (discretionary costs)
          </label>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.8rem' }}>
            Select categories where you can reduce optional expenses if needed.
          </span>
          <div className="d-flex flex-wrap gap-2">
            {expenseCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`tag-btn ${flexibleCategoryIds.includes(cat.id) ? 'active' : ''}`}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: flexibleCategoryIds.includes(cat.id) ? '#0f766e' : 'rgba(255, 255, 255, 0.03)',
                  color: flexibleCategoryIds.includes(cat.id) ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => handleCategoryToggle(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex justify-end gap-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.2rem' }}>
          <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '0.6rem 1.2rem' }}>
            <span className="d-flex align-center gap-1"><FiX /> Cancel</span>
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
            <span className="d-flex align-center gap-1"><FiSave /> Save Goal</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PassionGoalForm;
