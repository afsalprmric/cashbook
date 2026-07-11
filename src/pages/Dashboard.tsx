import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiUploadCloud, FiLogOut, FiRefreshCw, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, format, parseISO } from 'date-fns';
import { GoogleSyncService } from '../services/googleSync';
import './Dashboard.css';

const Dashboard = () => {
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  
  const HARDCODED_CLIENT_ID = "123616126355-7ujtrhe67gri4544dh1us8c5vgdi1stf.apps.googleusercontent.com";
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState<boolean>(GoogleSyncService.isLoggedIn());
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [autoSyncStatus, setAutoSyncStatus] = useState(GoogleSyncService.autoSyncStatus);

  useEffect(() => {
    GoogleSyncService.initializeGapi(HARDCODED_CLIENT_ID).catch(e => console.error("Google Init Error:", e));
    GoogleSyncService.onStatusChange = () => setAutoSyncStatus(GoogleSyncService.autoSyncStatus);
    return () => { GoogleSyncService.onStatusChange = null; };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setSyncStatus("Waiting for Google...");
      await GoogleSyncService.authenticate();
      setIsGoogleLoggedIn(true);
      
      setSyncStatus("Syncing...");
      await GoogleSyncService.restoreData();
      await GoogleSyncService.syncData();
      
      setSyncStatus("Synced!");
    } catch (e: any) {
      setSyncStatus(`Failed: ${e}`);
    }
    setTimeout(() => setSyncStatus(''), 4000);
  };

  const handleGoogleLogout = () => {
    GoogleSyncService.logout();
    setIsGoogleLoggedIn(false);
    setSyncStatus("Unlinked.");
    setTimeout(() => setSyncStatus(''), 4000);
  };
  
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categoriesMap = useLiveQuery(async () => {
    const cats = await db.categories.toArray();
    return cats.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {} as Record<string, string>);
  });

  const { income, expense, balance, categoryData, yearlyData } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catTotals: Record<string, number> = {};

    const monthlyStats: Record<string, { income: number; expense: number }> = {
      'Jan': { income: 0, expense: 0 },
      'Feb': { income: 0, expense: 0 },
      'Mar': { income: 0, expense: 0 },
      'Apr': { income: 0, expense: 0 },
      'May': { income: 0, expense: 0 },
      'Jun': { income: 0, expense: 0 },
      'Jul': { income: 0, expense: 0 },
      'Aug': { income: 0, expense: 0 },
      'Sep': { income: 0, expense: 0 },
      'Oct': { income: 0, expense: 0 },
      'Nov': { income: 0, expense: 0 },
      'Dec': { income: 0, expense: 0 },
    };

    if (!transactions) return { income: 0, expense: 0, balance: 0, categoryData: [], yearlyData: [] };

    let activeStart: Date, activeEnd: Date;
    if (timeframe === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      const dateContext = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      activeStart = startOfMonth(dateContext);
      activeEnd = endOfMonth(dateContext);
    } else {
      const dateContext = new Date(selectedYear, 0, 1);
      activeStart = startOfYear(dateContext);
      activeEnd = endOfYear(dateContext);
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (isWithinInterval(tDate, { start: activeStart, end: activeEnd })) {
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') exp += t.amount;

        if (timeframe === 'monthly') {
          if (t.type === chartType) {
            const catName = categoriesMap?.[t.categoryId] || 'Unknown';
            catTotals[catName] = (catTotals[catName] || 0) + t.amount;
          }
        } else {
          const monthName = format(tDate, 'MMM');
          if (monthlyStats[monthName]) {
             if (t.type === 'income') monthlyStats[monthName].income += t.amount;
             else if (t.type === 'expense') monthlyStats[monthName].expense += t.amount;
          }
        }
      }
    });

    const cData = Object.entries(catTotals).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    const yData = [
      { name: 'Jan', ...monthlyStats['Jan'] },
      { name: 'Feb', ...monthlyStats['Feb'] },
      { name: 'Mar', ...monthlyStats['Mar'] },
      { name: 'Apr', ...monthlyStats['Apr'] },
      { name: 'May', ...monthlyStats['May'] },
      { name: 'Jun', ...monthlyStats['Jun'] },
      { name: 'Jul', ...monthlyStats['Jul'] },
      { name: 'Aug', ...monthlyStats['Aug'] },
      { name: 'Sep', ...monthlyStats['Sep'] },
      { name: 'Oct', ...monthlyStats['Oct'] },
      { name: 'Nov', ...monthlyStats['Nov'] },
      { name: 'Dec', ...monthlyStats['Dec'] },
    ];

    return { income: inc, expense: exp, balance: inc - exp, categoryData: cData, yearlyData: yData };
  }, [transactions, categoriesMap, chartType, timeframe, selectedMonth, selectedYear]);

  const COLORS = ['#14b8a6', '#0ea5e9', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981'];

  const periodLabel = timeframe === 'monthly' ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : selectedYear.toString();

  return (
    <div className="dashboard-container">
      <div className="d-flex align-center justify-between mb-4 flex-wrap" style={{ gap: '1rem' }}>
        <h2 className="page-title mb-0">Dashboard Overview</h2>
        
        <div className="d-flex align-center gap-2">
          {syncStatus && <span className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>{syncStatus}</span>}
          
          {isGoogleLoggedIn ? (
            <div className="d-flex align-center gap-2 mr-2" style={{ fontSize: '0.85rem', marginRight: '0.5rem' }}>
               {autoSyncStatus === 'pending' && <FiRefreshCw style={{ color: 'var(--warning)', animation: 'spin 1s linear infinite' }} title="Syncing soon..." />}
               {autoSyncStatus === 'syncing' && <FiRefreshCw style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} title="Syncing..." />}
               {autoSyncStatus === 'done' && <FiCheck style={{ color: 'var(--success)' }} title="Synced" />}
               {autoSyncStatus === 'error' && <FiAlertCircle style={{ color: 'var(--error)' }} title="Sync Error" />}
               
               <button className="btn-secondary d-flex align-center gap-1" onClick={handleGoogleLogout} style={{ padding: '0.4rem 0.6rem', color: 'var(--error)' }}>
                 <FiLogOut /> Disconnect
               </button>
            </div>
          ) : (
            <button className="btn-primary d-flex align-center gap-1" onClick={handleGoogleLogin} style={{ padding: '0.4rem 0.6rem', marginRight: '0.5rem' }}>
              <FiUploadCloud /> Sign In
            </button>
          )}

          <select 
            className="form-input bg-glass"
            style={{ padding: '0.5rem 1rem', width: 'auto' }}
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'monthly' | 'yearly')}
          >
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
          </select>

          {timeframe === 'monthly' ? (
            <input 
              type="month" 
              className="form-input bg-glass" 
              style={{ width: 'auto' }}
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
            />
          ) : (
            <input 
              type="number" 
              className="form-input bg-glass" 
              style={{ width: '100px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
            />
          )}
        </div>
      </div>
      
      <div className="summary-cards">
        <div className="card glass-panel wallet-card">
          <div className="wallet-header">
            <h3>Net Balance</h3>
            <div className="stat-icon balance-icon"><FiDollarSign size={24} /></div>
          </div>
          <p className="wallet-balance">₹ {balance.toLocaleString()}</p>
          
          <div className="wallet-footer">
            <div className="wallet-stat">
              <div className="stat-icon income-icon sm"><FiTrendingUp size={16} /></div>
              <div>
                <span className="stat-label">Income</span>
                <span className="stat-value text-success">₹ {income.toLocaleString()}</span>
              </div>
            </div>
            <div className="wallet-divider"></div>
            <div className="wallet-stat">
              <div className="stat-icon expense-icon sm"><FiTrendingDown size={16} /></div>
              <div>
                <span className="stat-label">Expense</span>
                <span className="stat-value text-error">₹ {expense.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex align-center justify-between mt-6 mb-2 flex-wrap" style={{ gap: '1rem' }}>
        <h3 className="section-title mb-0" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          Visualizations ({periodLabel})
        </h3>
        
        {timeframe === 'monthly' && (
          <div className="toggle-group" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn-secondary"
              onClick={() => setChartType('income')}
              style={{ padding: '0.5rem 1rem', ...(chartType === 'income' ? { backgroundColor: 'var(--success)', color: 'white', border: 'none' } : {}) }}
            >
              Income
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setChartType('expense')}
              style={{ padding: '0.5rem 1rem', ...(chartType === 'expense' ? { backgroundColor: 'var(--error)', color: 'white', border: 'none' } : {}) }}
            >
              Expense
            </button>
          </div>
        )}
      </div>

      <div className="charts-grid mt-4" style={{ display: 'grid', gap: 'var(--spacing-lg)', gridTemplateColumns: timeframe === 'monthly' ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr' }}>
        {timeframe === 'monthly' ? (
          <>
            <div className="card glass-panel chart-card fade-in">
              <h3 style={{ textTransform: 'capitalize' }}>Monthly {chartType}s by Category</h3>
              <div className="chart-wrapper">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => `₹ ${val.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-8" style={{ textTransform: 'lowercase' }}>No {chartType}s to display.</p>
                )}
              </div>
            </div>

            <div className="card glass-panel chart-card fade-in" style={{ animationDelay: '0.1s' }}>
              <h3>Top Categories</h3>
              <div className="chart-wrapper">
                 {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(val: any) => `₹ ${val.toLocaleString()}`} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                         {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                 ) : (
                   <p className="text-muted text-center py-8">No data to display.</p>
                 )}
              </div>
            </div>
          </>
        ) : (
          <div className="card glass-panel chart-card fade-in">
            <h3>Income vs Expense ({selectedYear})</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                  <Tooltip 
                    formatter={(val: any) => `₹ ${val.toLocaleString()}`} 
                    cursor={{fill: 'var(--hover-bg)', opacity: 0.1}} 
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--surface-color)', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="expense" name="Expense" fill="var(--error)" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
