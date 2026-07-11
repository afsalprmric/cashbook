import { db } from '../db/database';

declare var google: any;
declare var gapi: any;

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

export class GoogleSyncService {
  private static tokenClient: any = null;
  private static accessToken: string | null = null;
  private static gapiInited = false;
  private static autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  public static autoSyncStatus: 'idle' | 'pending' | 'syncing' | 'done' | 'error' = 'idle';
  public static onStatusChange: (() => void) | null = null;

  public static initializeGapi(client_id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.gapiInited && this.tokenClient) return resolve();
      if (!(window as any).gapi || !(window as any).google) {
        return reject("Google scripts not loaded. Check internet connection.");
      }

      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          this.gapiInited = true;

          this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: client_id,
            scope: SCOPES,
            callback: '', // defined dynamically later
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public static authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) return reject("Google Sync service not initialized with Client ID.");
      
      try {
        this.tokenClient.callback = async (resp: any) => {
          if (resp.error !== undefined) {
            return reject(resp.error);
          }
          this.accessToken = resp.access_token;
          localStorage.setItem('cashbook_google_token', this.accessToken!);
          resolve(this.accessToken!);
        };

        if (gapi.client.getToken() === null) {
          this.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
          this.tokenClient.requestAccessToken({prompt: ''});
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  public static isLoggedIn(): boolean {
    return !!localStorage.getItem('cashbook_google_token');
  }

  public static logout() {
    this.accessToken = null;
    localStorage.removeItem('cashbook_google_token');
    const token = gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        gapi.client.setToken('');
      });
    }
  }

  /** Debounced auto-sync: waits 1s after last DB change before syncing */
  public static scheduleAutoSync() {
    if (!this.isLoggedIn()) return;
    if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
    this.autoSyncStatus = 'pending';
    this.onStatusChange?.();
    this.autoSyncTimer = setTimeout(async () => {
      this.autoSyncStatus = 'syncing';
      this.onStatusChange?.();
      const success = await this.syncData();
      this.autoSyncStatus = success ? 'done' : 'error';
      this.onStatusChange?.();
      // Reset to idle after 4 seconds
      setTimeout(() => {
        this.autoSyncStatus = 'idle';
        this.onStatusChange?.();
      }, 4000);
    }, 1000);
  }

  // Locates or Creates the Backup Spreadsheet
  private static async getBackupSpreadsheetId(): Promise<string> {
    const existingId = localStorage.getItem('cashbook_spreadsheet_id');
    if (existingId) return existingId;

    // Search for existing file
    const query = "name='Cashbook_Lite_Backup' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${this.accessToken || localStorage.getItem('cashbook_google_token')}` }
    }).then(r => r.json());

    if (searchRes.files && searchRes.files.length > 0) {
      const id = searchRes.files[0].id;
      localStorage.setItem('cashbook_spreadsheet_id', id);
      return id;
    }

    // Create new
    const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${this.accessToken || localStorage.getItem('cashbook_google_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: 'Cashbook_Lite_Backup' },
        sheets: [
          { properties: { title: 'Transactions' } },
          { properties: { title: 'Loans' } },
          { properties: { title: 'Loan Repayments' } },
          { properties: { title: 'Investments' } },
          { properties: { title: 'Categories' } },
          { properties: { title: 'PaymentModes' } }
        ]
      })
    }).then(r => r.json());

    const newId = createRes.spreadsheetId;
    localStorage.setItem('cashbook_spreadsheet_id', newId);
    return newId;
  }

  public static async syncData(): Promise<boolean> {
    if (!this.isLoggedIn()) return false;
    const token = this.accessToken || localStorage.getItem('cashbook_google_token');
    if (!token) return false;

    // Ensure token is attached
    if (!gapi.client.getToken()) {
        gapi.client.setToken({ access_token: token });
    }

    try {
      const spreadsheetId = await this.getBackupSpreadsheetId();
      
      // Fetch all local data
      const transactions = await db.transactions.toArray();
      const loans = await db.loans.toArray();
      const investments = await db.investments.toArray();
      const categories = await db.categories.toArray();
      const paymentModes = await db.paymentModes.toArray();

      // Ensure sheets exist
      await this.ensureSheetsExist(spreadsheetId, ['Transactions', 'Loans', 'Loan Repayments', 'Investments', 'Categories', 'PaymentModes']);

      // Format Transaction Data
      const txData = [['ID', 'Date', 'Type', 'Amount', 'Category', 'Mode', 'Note']];
      transactions.forEach(t => txData.push([t.id || '', t.date, t.type, t.amount.toString(), t.categoryId || '', t.paymentModeId || '', t.note || '']));

      // Format Loan Data (parent only)
      const loanData = [['ID', 'Date', 'Payee Name', 'Phone', 'Type', 'Amount', 'Status', 'Note']];
      loans.forEach(l => loanData.push([l.id || '', l.date, l.payeeName, l.payeePhone || '', l.type, l.amount.toString(), l.status, l.note || '']));

      // Format Loan Repayments (flat list of all child repayments)
      const repData = [['Loan ID', 'Payee Name', 'Repayment ID', 'Date', 'Amount', 'Note']];
      loans.forEach(l => {
        (l.repayments || []).forEach(rp => {
          repData.push([l.id, l.payeeName, rp.id, rp.date, rp.amount.toString(), rp.note || '']);
        });
      });

      // Format Investment Data
      const invData = [['ID', 'Start Date', 'Name', 'Type', 'Invested', 'Current Value', 'Status', 'Note']];
      investments.forEach(i => invData.push([i.id || '', i.startDate, i.name, i.type, i.amountInvested.toString(), i.currentValue.toString(), i.status, i.note || '']));

      // Format Categories Data
      const catData = [['ID', 'Name', 'Type', 'Is Default']];
      categories.forEach(c => catData.push([c.id || '', c.name, c.type, c.isDefault ? 'true' : 'false']));

      // Format Payment Modes Data
      const pmData = [['ID', 'Name', 'Is Default']];
      paymentModes.forEach(p => pmData.push([p.id || '', p.name, p.isDefault ? 'true' : 'false']));

      // Execute bulk update
      await this.clearAndWriteSheet(spreadsheetId, 'Transactions', txData);
      await this.clearAndWriteSheet(spreadsheetId, 'Loans', loanData);
      await this.clearAndWriteSheet(spreadsheetId, 'Loan Repayments', repData);
      await this.clearAndWriteSheet(spreadsheetId, 'Investments', invData);
      await this.clearAndWriteSheet(spreadsheetId, 'Categories', catData);
      await this.clearAndWriteSheet(spreadsheetId, 'PaymentModes', pmData);

      localStorage.setItem('cashbook_last_sync', Date.now().toString());
      return true;
    } catch (err: any) {
      console.error("Google Sync Failed:", err);
      // Token might be expired, log out dynamically to force re-auth
      if (err?.status === 401) {
          this.logout();
      }
      return false;
    }
  }

  public static async restoreData(): Promise<boolean> {
    if (!this.isLoggedIn()) return false;
    const token = this.accessToken || localStorage.getItem('cashbook_google_token');
    if (!token) return false;

    if (!gapi.client.getToken()) {
        gapi.client.setToken({ access_token: token });
    }

    try {
      const spreadsheetId = await this.getBackupSpreadsheetId();
      
      // Restore Transactions
      let txRows: any[] = [];
      try {
        const txRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'Transactions'!A:Z" });
        txRows = txRes.result?.values || [];
      } catch (e) { console.log('Transactions fetch error', e); }

      if (txRows.length > 1) {
         const transactions = txRows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => ({
           id: row[0],
           date: row[1],
           type: row[2],
           amount: parseFloat(row[3]) || 0,
           categoryId: row[4],
           paymentModeId: row[5],
           note: row[6] || '',
           createdAt: Date.now(),
           updatedAt: Date.now()
         }));
         if (transactions.length > 0) await db.transactions.bulkPut(transactions);
      }

      // Restore Loans (parent records first)
      let lRows: any[] = [];
      try {
        const lRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'Loans'!A:Z" });
        lRows = lRes.result?.values || [];
      } catch (e) { console.log('Loans fetch error', e); }

      // Restore Loan Repayments (flat list)
      let repRows: any[] = [];
      try {
        const repRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'Loan Repayments'!A:Z" });
        repRows = repRes.result?.values || [];
      } catch (e) { console.log('Loan Repayments fetch error', e); }

      // Build repayments map: loanId -> repayment[]
      const repaymentsMap: Record<string, any[]> = {};
      if (repRows.length > 1) {
        repRows.slice(1).filter((row: any[]) => row[0]).forEach((row: any[]) => {
          const loanId = row[0];
          if (!repaymentsMap[loanId]) repaymentsMap[loanId] = [];
          repaymentsMap[loanId].push({ id: row[2], date: row[3], amount: parseFloat(row[4]) || 0, note: row[5] || '' });
        });
      }

      if (lRows.length > 1) {
         const loans = lRows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => ({
           id: row[0],
           date: row[1],
           payeeName: row[2],
           payeePhone: row[3] || '',
           type: row[4],
           amount: parseFloat(row[5]) || 0,
           status: row[6],
           note: row[7] || '',
           repayments: repaymentsMap[row[0]] || [],
           createdAt: Date.now(),
           updatedAt: Date.now()
         }));
         if (loans.length > 0) await db.loans.bulkPut(loans);
      }

      // Restore Investments
      let iRows: any[] = [];
      try {
        const iRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'Investments'!A:Z" });
        iRows = iRes.result?.values || [];
      } catch (e) { console.log('Investments fetch error', e); }

      if (iRows.length > 1) {
         const investments = iRows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => ({
           id: row[0],
           startDate: row[1],
           name: row[2],
           type: row[3],
           amountInvested: parseFloat(row[4]) || 0,
           currentValue: parseFloat(row[5]) || 0,
           status: row[6],
           note: row[7] || '',
           createdAt: Date.now(),
           updatedAt: Date.now()
         }));
         if (investments.length > 0) await db.investments.bulkPut(investments);
      }

      // Restore Categories
      let catRows: any[] = [];
      try {
        const catRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'Categories'!A:Z" });
        catRows = catRes.result?.values || [];
      } catch (e) { console.log('Categories fetch error', e); }

      if (catRows.length > 1) {
         const categories = catRows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => ({
           id: row[0],
           name: row[1],
           type: row[2],
           isDefault: row[3] === 'true'
         }));
         if (categories.length > 0) await db.categories.bulkPut(categories);
      }

      // Restore Payment Modes
      let pmRows: any[] = [];
      try {
        const pmRes = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range: "'PaymentModes'!A:Z" });
        pmRows = pmRes.result?.values || [];
      } catch (e) { console.log('PaymentModes fetch error', e); }

      if (pmRows.length > 1) {
         const paymentModes = pmRows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => ({
           id: row[0],
           name: row[1],
           isDefault: row[2] === 'true'
         }));
         if (paymentModes.length > 0) await db.paymentModes.bulkPut(paymentModes);
      }

      return true;
    } catch (err: any) {
      console.error("Restore Failed:", err);
      if (err?.status === 401) this.logout();
      return false;
    }
  }

  private static async ensureSheetsExist(spreadsheetId: string, titles: string[]) {
    const meta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.result.sheets.map((s: any) => s.properties.title);
    
    const requests: any[] = [];
    for (const title of titles) {
      if (!existingTitles.includes(title)) {
        requests.push({ addSheet: { properties: { title } } });
      }
    }
    
    if (requests.length > 0) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
      });
    }
  }

  private static async clearAndWriteSheet(spreadsheetId: string, sheetTitle: string, values: any[][]) {
    // Clear old data
    await gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetTitle}'!A:Z`,
    });
    // Write new data
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }
}
