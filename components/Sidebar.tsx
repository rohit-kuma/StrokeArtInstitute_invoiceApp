import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { type ViewType } from '../types';
import { UploadIcon, FileIcon, AnalyticsIcon, SunIcon, MoonIcon, CloseIcon } from './icons/Icons';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setIsOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navItems = [
    { id: 'upload', label: 'Upload Portal', icon: <UploadIcon /> },
    { id: 'invoices', label: 'Invoice History', icon: <FileIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    if (window.innerWidth < 768) { // md breakpoint
      setIsOpen(false);
    }
  };

  return (
    <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-white/10 dark:bg-dark-card/50 backdrop-blur-lg border-r border-gray-200/20 dark:border-dark-border/50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200/10 dark:border-dark-border/30">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Invoice to Sheet AI
        </h1>
        <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-gray-500 dark:text-gray-400">
          <CloseIcon />
        </button>
      </div>
      <nav className="flex flex-col justify-between h-[calc(100%-65px)] p-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id as ViewType)}
                className={`flex items-center w-full px-4 py-3 my-1 rounded-lg transition-all duration-200 ${currentView === item.id
                  ? 'bg-accent-blue/20 text-accent-blue shadow-glow'
                  : 'hover:bg-gray-200/50 dark:hover:bg-dark-border/50'
                  }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-gray-200/50 dark:bg-dark-border/50 hover:bg-gray-300/50 dark:hover:bg-dark-border mb-2"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            <span className="ml-3">Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-accent-blue text-white hover:bg-blue-600 transition-colors shadow-glow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="ml-3 font-bold">Install App</span>
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
