import { useState, useEffect } from 'react';
import { FiDownloadCloud, FiUploadCloud, FiGlobe, FiDatabase, FiFile, FiLock, FiLogOut, FiRefreshCw, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { db } from '../db/database';
import * as XLSX from 'xlsx';
import { GoogleSyncService } from '../services/googleSync';

const Settings = () => {
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [autoSyncStatus, setAutoSyncStatus] = useState(GoogleSyncService.autoSyncStatus);
  
  // Google Configuration State
  const HARDCODED_CLIENT_ID = "123616126355-7ujtrhe67gri4544dh1us8c5vgdi1stf.apps.googleusercontent.com";
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState<boolean>(GoogleSyncService.isLoggedIn());
  const lastSync = localStorage.getItem('cashbook_last_sync');
  const lastSyncLabel = lastSync ? new Date(parseInt(lastSync)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Never';

  useEffect(() => {
    GoogleSyncService.initializeGapi(HARDCODED_CLIENT_ID).catch(e => console.error("Google Init Error:", e));
    // Subscribe to auto-sync status changes
    GoogleSyncService.onStatusChange = () => setAutoSyncStatus(GoogleSyncService.autoSyncStatus);
    return () => { GoogleSyncService.onStatusChange = null; };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setSyncStatus("Waiting for Google Authorization...");
      await GoogleSyncService.authenticate();
      setIsGoogleLoggedIn(true);
      
      setSyncStatus("Syncing data with Google Drive...");
      await GoogleSyncService.restoreData(); // Pull existing backup from Drive
      await GoogleSyncService.syncData();    // Push merged local data to Drive
      
      setSyncStatus("Successfully linked & synced with Google Drive!");
    } catch (e: any) {
      setSyncStatus(`Authentication Failed: ${e}`);
    }
    setTimeout(() => setSyncStatus(''), 4000);
  };

  const handleGoogleLogout = () => {
    GoogleSyncService.logout();
    setIsGoogleLoggedIn(false);
    setSyncStatus("Unlinked from Google Account.");
    setTimeout(() => setSyncStatus(''), 4000);
  };

  // ... [Keep existing Export/Import Logic safely below] ...
  const handleExportData = async () => {
    try {
      const dbData = {
        transactions: await db.transactions.toArray(),
        categories: await db.categories.toArray(),
        paymentModes: await db.paymentModes.toArray(),
        loans: await db.loans.toArray(),
        investments: await db.investments.toArray(),
        funds: await db.funds.toArray()
      };
      const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cashbook_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      console.error(e);
      alert("Error exporting data.");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncStatus('Importing spreadsheet...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', raw: false });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, raw: false });

        let importedCount = 0;
        const categories = await db.categories.toArray();
        const paymentModes = await db.paymentModes.toArray();
        const defaultPaymentModeId = paymentModes?.[0]?.id || crypto.randomUUID();

        let dateIdx = 0, timeIdx = 1, remarkIdx = 2, catIdx = 3, cashInIdx = 4, cashOutIdx = 5;

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '').trim().toLowerCase();
            if (val === 'date') { dateIdx = j; }
            if (val === 'time') timeIdx = j;
            if (val === 'remark') remarkIdx = j;
            if (val === 'category') catIdx = j;
            if (val === 'cash in' || val === 'cash_in') cashInIdx = j;
            if (val === 'cash out' || val === 'cash_out') cashOutIdx = j;
          }
        }

        for (const row of rows) {
          if (!Array.isArray(row)) continue;

          const dateStr = String(row[dateIdx] || '').trim();
          if (!dateStr || dateStr.toLowerCase() === 'date') continue;

          const timeStr = String(row[timeIdx] || '').trim();
          const remark = String(row[remarkIdx] || '').trim();
          const categoryName = String(row[catIdx] || '').trim() || 'Uncategorized';
          const cashInRaw = row[cashInIdx];
          const cashOutRaw = row[cashOutIdx];
          
          let parsedDate = new Date(`${dateStr} ${timeStr}`.trim());
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(dateStr); 
          }
          if (isNaN(parsedDate.getTime())) continue;
          
          const isoDate = parsedDate.toISOString().split('T')[0];

          const cleanCashIn = String(cashInRaw || '').replace(/[^0-9.-]+/g, '');
          const cleanCashOut = String(cashOutRaw || '').replace(/[^0-9.-]+/g, '');
          
          const cashIn = parseFloat(cleanCashIn);
          const cashOut = parseFloat(cleanCashOut);
          
          const isIncome = !isNaN(cashIn) && cashIn > 0;
          const isExpense = !isNaN(cashOut) && cashOut > 0;

          if (!isIncome && !isExpense) continue;

          const transactionsToAdd = [];
          if (isIncome) transactionsToAdd.push({ type: 'income', amount: cashIn });
          if (isExpense) transactionsToAdd.push({ type: 'expense', amount: cashOut });

          for (const txData of transactionsToAdd) {
            const { type, amount } = txData as { type: 'income' | 'expense', amount: number };

            let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type);
            if (!category) {
              category = {
                id: crypto.randomUUID(),
                name: categoryName,
                type: type,
                isDefault: false
              };
              await db.categories.add(category);
              categories.push(category);
            }

            await db.transactions.add({
              id: crypto.randomUUID(),
              type,
              amount,
              categoryId: category.id,
              date: isoDate,
              paymentModeId: defaultPaymentModeId,
              note: remark,
              createdAt: parsedDate.getTime(),
              updatedAt: Date.now()
            });

            importedCount++;
          }
        }

        setSyncStatus(`Successfully imported ${importedCount} transactions!`);
      } catch (error) {
        console.error("Import error:", error);
        setSyncStatus('Error importing file. Please check format.');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="layout-content fade-in">
      <h2 className="page-title mb-6">Settings & Backup</h2>

      <div className="grid gap-6">
        
        {/* Google Configuration Container */}
        <div className="card glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><FiLock /> Cloud Backup (Google Drive)</h3>
          <p className="text-secondary mb-4">Securely sync and backup your data to your personal Google Drive. Auto-sync runs 5 seconds after each change.</p>

          {isGoogleLoggedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-hover)', fontSize: '0.9rem' }}>
              {autoSyncStatus === 'pending' && <><FiRefreshCw style={{ color: 'var(--warning)', animation: 'spin 1s linear infinite' }} /> <span style={{ color: 'var(--warning)' }}>Changes detected – syncing soon...</span></>}
              {autoSyncStatus === 'syncing' && <><FiRefreshCw style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /> <span style={{ color: 'var(--accent-blue)' }}>Syncing to Google Sheets...</span></>}
              {autoSyncStatus === 'done' && <><FiCheck style={{ color: 'var(--success)' }} /> <span style={{ color: 'var(--success)' }}>Auto-synced successfully!</span></>}
              {autoSyncStatus === 'error' && <><FiAlertCircle style={{ color: 'var(--error)' }} /> <span style={{ color: 'var(--error)' }}>Auto-sync failed. Try manual sync.</span></>}
              {autoSyncStatus === 'idle' && <><FiCheck style={{ color: 'var(--text-muted)' }} /> <span className="text-muted">Last sync: {lastSyncLabel}</span></>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!isGoogleLoggedIn ? (
              <button className="btn-primary d-flex align-center gap-2" onClick={handleGoogleLogin}>
                <FiUploadCloud /> Sign In with Google
              </button>
            ) : (
              <button className="btn-secondary d-flex align-center gap-2" onClick={handleGoogleLogout} style={{ color: 'var(--error)' }}>
                <FiLogOut /> Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Local Backup / CSV Container */}
        <div className="card glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FiDatabase /> Local Backup & Restore</h3>
          <p className="text-secondary mb-4">Export your entire cashbook database locally or bulk import an excel file.</p>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary d-flex align-center gap-2" onClick={handleExportData}>
              <FiDownloadCloud /> Export Local Backup
            </button>
            <label className="btn-secondary d-flex align-center gap-2" style={{ cursor: 'pointer' }}>
              <FiFile /> Import Excel Format
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} style={{ display: 'none' }} />
            </label>
          </div>
          {syncStatus && <p className="text-success mt-4 fade-in" style={{ fontWeight: 600 }}>{syncStatus}</p>}
        </div>

        <div className="card glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FiGlobe /> Language Preferences</h3>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="text-secondary">App Language</label>
            <select className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
              <option value="en">English (Default)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
