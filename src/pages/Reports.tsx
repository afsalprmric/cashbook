import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { FiDownload, FiFilter, FiFileText } from 'react-icons/fi';
import { format, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Reports.css';

const Reports = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentModes = useLiveQuery(() => db.paymentModes.toArray());

  const getFilteredData = () => {
    if (!transactions || !categories || !paymentModes) return [];

    const categoriesMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {} as Record<string, string>);
    const paymentMap = paymentModes.reduce((acc, pm) => ({ ...acc, [pm.id]: pm.name }), {} as Record<string, string>);

    return transactions
      .filter(t => {
        const tDate = parseISO(t.date);
        const inRange = isWithinInterval(tDate, { start: parseISO(startDate), end: parseISO(endDate) });
        if (!inRange) return false;

        const catMatch = filterCategoryId === 'all' ? true : t.categoryId === filterCategoryId;
        if (!catMatch) return false;

        const typeMatch = filterType === 'all' ? true : t.type === filterType;
        if (!typeMatch) return false;

        return true;
      })
      .map(t => ({
        Date: format(parseISO(t.date), 'dd/MM/yyyy'),
        Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
        Category: categoriesMap[t.categoryId] || 'Unknown',
        Amount: t.amount,
        'Payment Mode': paymentMap[t.paymentModeId] || 'Unknown',
        Note: t.note || '-'
      }))
      .sort((a, b) => new Date(a.Date.split('/').reverse().join('-')).getTime() - new Date(b.Date.split('/').reverse().join('-')).getTime());
  };

  const downloadExcel = () => {
    const data = getFilteredData();
    if (data.length === 0) return alert('No data to export.');
    
    // Add Summary Row
    const totalIncome = data.filter(d => d.Type === 'Income').reduce((s, d) => s + d.Amount, 0);
    const totalExpense = data.filter(d => d.Type === 'Expense').reduce((s, d) => s + d.Amount, 0);
    
    const exportData = [...data, { Date: '', Type: 'TOTALS', Category: '', Amount: '', 'Payment Mode': '', Note: '' }, { Date: 'Total Income', Type: totalIncome, Category: 'Total Expense', Amount: totalExpense, 'Payment Mode': 'Balance', Note: totalIncome - totalExpense }];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cashflow");
    XLSX.writeFile(workbook, `Cashbook_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const downloadPDF = () => {
    const data = getFilteredData();
    if (data.length === 0) return alert('No data to export.');

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Cashbook Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);

    const totalIncome = data.filter(d => d.Type === 'Income').reduce((s, d) => s + d.Amount, 0);
    const totalExpense = data.filter(d => d.Type === 'Expense').reduce((s, d) => s + d.Amount, 0);
    const balance = totalIncome - totalExpense;

    doc.text(`Total Income: Rs ${totalIncome.toFixed(2)}  |  Total Expense: Rs ${totalExpense.toFixed(2)}  |  Balance: Rs ${balance.toFixed(2)}`, 14, 38);

    const tableColumn = ["Date", "Type", "Category", "Payment Mode", "Amount", "Note"];
    const tableRows = data.map(t => [t.Date, t.Type, t.Category, t["Payment Mode"], `Rs ${t.Amount.toFixed(2)}`, t.Note]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 9, font: 'helvetica' },
      headStyles: { fillColor: [20, 184, 166] }
    });

    doc.save(`Cashbook_Report_${startDate}_to_${endDate}.pdf`);
  };

  const filteredData = getFilteredData();

  return (
    <div className="reports-page layout-content fade-in">
      <h2 className="page-title">Generate Reports</h2>

      <div className="filter-panel glass-panel">
        <div className="filter-header">
          <h3><FiFilter /> Filter Cashflow</h3>
        </div>
        
        <div className="filter-grid">
          <div className="form-group">
            <label>Select Month</label>
            <input 
              type="month" 
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  const [year, month] = value.split('-');
                  const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
                  const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);
                  setStartDate(format(start, 'yyyy-MM-dd'));
                  setEndDate(format(end, 'yyyy-MM-dd'));
                }
              }} 
              className="form-input" 
            />
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" min="2000-01-01" max="2100-12-31" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" min="2000-01-01" max="2100-12-31" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label>Cashflow Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="form-input">
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className="form-input">
              <option value="all">All Categories</option>
              {categories?.filter(c => filterType === 'all' || c.type === filterType).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="download-actions mt-6">
          <button className="btn-secondary d-flex align-center gap-2" onClick={downloadPDF}>
            <FiFileText /> Download PDF
          </button>
          <button className="btn-primary d-flex align-center gap-2" onClick={downloadExcel}>
            <FiDownload /> Download Excel
          </button>
        </div>
      </div>

      <div className="preview-panel glass-panel mt-6">
        <h3>Preview ({filteredData.length} records)</h3>
        {filteredData.length > 0 ? (
          <div className="table-responsive mt-4">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Remarks</th>
                  <th>Mode</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 5).map((d, i) => (
                  <tr key={i}>
                    <td>{d.Date}</td>
                    <td><span className={`type-badge ${d.Type.toLowerCase()}`}>{d.Type}</span></td>
                    <td>{d.Category}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.Note}>{d.Note}</td>
                    <td>{d['Payment Mode']}</td>
                    <td className="amount-cell">{d.Amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 5 && <p className="text-center text-muted mt-4">Showing first 5 rows of {filteredData.length} total generated records.</p>}
          </div>
        ) : (
          <p className="text-muted text-center mt-4 p-6">No records match the selected filters.</p>
        )}
      </div>
    </div>
  );
};

export default Reports;
