
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onRegistered(r: any) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.log('SW Registration error', error);
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
