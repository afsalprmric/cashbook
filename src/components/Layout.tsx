import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { FiHome, FiList, FiPieChart, FiSettings, FiMenu, FiX, FiTag, FiBriefcase, FiTrendingUp, FiCreditCard, FiCheckSquare, FiPlus } from 'react-icons/fi';
import TransactionModal from './TransactionModal';
import './Layout.css';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const primaryLinks = [
    { to: "/", icon: <FiHome size={22} />, label: "Home" },
    { to: "/transactions", icon: <FiList size={22} />, label: "Cashflow" },
    { isFab: true }, // Placeholder for FAB
    { to: "/loans", icon: <FiBriefcase size={22} />, label: "Loans" },
    { to: "/credit-cards", icon: <FiCreditCard size={22} />, label: "Cards" },
  ];

  const allLinks = [
    { to: "/", icon: <FiHome />, label: "Dashboard" },
    { to: "/transactions", icon: <FiList />, label: "Cashflow" },
    { to: "/loans", icon: <FiBriefcase />, label: "Liabilities" },
    { to: "/credit-cards", icon: <FiCreditCard />, label: "Cards & EMIs" },
    { to: "/investments", icon: <FiTrendingUp />, label: "Investments" },
    { to: "/bank-clear", icon: <FiCheckSquare />, label: "Bank Clearing" },
    { to: "/categories", icon: <FiTag />, label: "Categories" },
    { to: "/reports", icon: <FiPieChart />, label: "Reports" },
    { to: "/settings", icon: <FiSettings />, label: "Settings" },
  ];

  return (
    <div className="layout-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay d-md-none" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar (Hidden on mobile unless opened via Menu) */}
      <aside className={`sidebar glass-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="gradient-text">Cashbook</h2>
          <button className="close-btn d-md-none" onClick={() => setIsSidebarOpen(false)}>
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {allLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="d-flex align-center gap-3">
            <button className="menu-btn d-md-none" onClick={toggleSidebar}>
              <FiMenu size={24} />
            </button>
            <div className="topbar-title">
              {allLinks.find(l => l.to === location.pathname)?.label || 'Cashbook'}
            </div>
          </div>
        </header>

        <div className="content-area animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav d-md-none glass-panel">
        {primaryLinks.map((link) => {
          if (link.isFab) {
            return (
              <div key="fab" className="bottom-nav-fab-container">
                <button className="bottom-nav-fab" onClick={() => setIsTransactionModalOpen(true)}>
                  <FiPlus size={28} />
                </button>
              </div>
            );
          }
          return (
            <NavLink
              key={link.to}
              to={link.to!}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        transactionToEdit={null}
      />
    </div>
  );
};

export default Layout;
