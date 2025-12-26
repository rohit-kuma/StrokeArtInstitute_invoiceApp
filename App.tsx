
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import UploadPortal from './components/UploadPortal';
import InvoicesList from './components/InvoicesList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { useTheme } from './context/ThemeContext';
import { type ViewType } from './types';
import { MenuIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('upload');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();

  const renderView = useMemo(() => {
    switch (currentView) {
      case 'invoices':
        return <InvoicesList />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'upload':
      default:
        return <UploadPortal />;
    }
  }, [currentView]);

  return (
    <div className={`${theme} font-sans text-gray-800 dark:text-gray-200 min-h-screen flex`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 ml-0 md:ml-64">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 mb-4 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-dark-card">
          <MenuIcon />
        </button>
        {renderView}
      </main>
    </div>
  );
};

export default App;
