import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PassionGoal, PassionMetrics, PassionPlan } from '../types/passion';
import { formatCurrency } from './financeCalculator';

export function downloadPassionPlanPDF(goal: PassionGoal, metrics: PassionMetrics, plan: PassionPlan) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(15, 118, 110); // Teal accent
  doc.text('PassionLedger AI - Action Plan', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date(plan.generatedAt).toLocaleString('en-IN')} | Source: ${plan.source === 'gemini' ? 'Gemini AI Plan' : 'Locally Generated Fallback'}`, 14, 27);
  
  // Divider
  doc.setDrawColor(200);
  doc.line(14, 30, 196, 30);
  
  // Goal Info
  doc.setFontSize(14);
  doc.setTextColor(50);
  doc.text(`Goal: ${goal.name}`, 14, 38);
  doc.setFontSize(10);
  
  const splitReason = doc.splitTextToSize(`Why this matters: ${goal.reason}`, 180);
  doc.text(splitReason, 14, 44);
  
  // Metrics Table
  const metricsData = [
    ['Target Amount', formatCurrency(goal.targetAmount), 'Current Savings', formatCurrency(goal.currentSaved)],
    ['Remaining Need', formatCurrency(metrics.remainingAmount), 'Progress', `${metrics.progressPercentage.toFixed(1)}%`],
    ['Required Monthly', `${formatCurrency(metrics.requiredMonthlyContribution)}/mo`, 'Simulated Monthly', `${formatCurrency(metrics.simulatedMonthlyContribution)}/mo`],
    ['Available Months', `${metrics.availableMonths} mo`, 'Est. Completion', metrics.estimatedCompletionMonths ? `${metrics.estimatedCompletionMonths} months (${metrics.estimatedCompletionDate})` : 'N/A'],
    ['Feasibility', metrics.feasibility.toUpperCase().replace(/_/g, ' '), 'Funding Gap', `${formatCurrency(metrics.fundingGapPerMonth)}/mo`]
  ];
  
  const startYOfTable = 44 + splitReason.length * 5 + 2;
  
  autoTable(doc, {
    body: metricsData,
    startY: startYOfTable,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 50 }
    }
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // AI Plan Headline
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text('Strategic Insights', 14, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(plan.headline, 14, currentY);
  currentY += 6;
  
  // Plan Summary (Word Wrapped)
  const splitSummary = doc.splitTextToSize(plan.summary, 180);
  doc.text(splitSummary, 14, currentY);
  currentY += splitSummary.length * 5 + 6;
  
  // Suggestions Table
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text('Key Opportunities & Savings Suggestions', 14, currentY);
  currentY += 4;
  
  const suggestionHeaders = [['Suggestion', 'Category', 'Action', 'Impact/mo']];
  const suggestionRows = plan.suggestions.map(s => [
    s.title,
    s.category,
    s.action,
    formatCurrency(s.estimatedMonthlyImpact)
  ]);
  
  autoTable(doc, {
    head: suggestionHeaders,
    body: suggestionRows,
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [15, 118, 110] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 30 },
      2: { cellWidth: 85 },
      3: { halign: 'right', cellWidth: 22 }
    }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 8;
  
  // Milestones & Actions Side-by-Side (or vertical if space is tight)
  if (currentY > 200) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text('Milestones & Weekly Tasks', 14, currentY);
  currentY += 6;
  
  // Milestones columns
  const milestoneCols = [['Milestone', 'Target Value', 'Estimated Date']];
  const milestoneRows = plan.milestones.map(m => [
    m.label,
    formatCurrency(m.targetAmount),
    m.estimatedDate || 'N/A'
  ]);
  
  autoTable(doc, {
    head: milestoneCols,
    body: milestoneRows,
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 100, 100] }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 8;
  
  // First week actions
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('First-Week Checklist:', 14, currentY);
  currentY += 6;
  doc.setFontSize(9);
  doc.setTextColor(60);
  
  plan.firstWeekActions.forEach(action => {
    if (currentY > 275) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(`[ ] ${action}`, 18, currentY);
    currentY += 5;
  });
  currentY += 3;
  
  // Encouragement
  if (currentY > 270) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`"${plan.encouragement}"`, 14, currentY);
  currentY += 12;
  
  // Footer / Privacy & Disclaimer
  if (currentY > 275) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Privacy Boundary: No private transactions, account IDs, or bank records were transmitted to generate this plan.', 14, currentY);
  currentY += 4;
  doc.text('Disclaimer: This report is a computational savings model and does not constitute professional investment or financial advice.', 14, currentY);
  
  doc.save(`PassionPlan_${goal.name.replace(/\s+/g, '_')}.pdf`);
}
