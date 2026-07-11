import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions.tsx';
import Categories from './pages/Categories.tsx';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Loans from './pages/Loans';
import BankClear from './pages/BankClear';
import Investments from './pages/Investments';
import CreditCards from './pages/CreditCards';
import { seedDatabase } from './db/database';

function App() {
  React.useEffect(() => {
    // Seed initial data on startup
    seedDatabase().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="loans" element={<Loans />} />
          <Route path="investments" element={<Investments />} />
          <Route path="bank-clear" element={<BankClear />} />
          <Route path="credit-cards" element={<CreditCards />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
