// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { EnhancedApp } from './components/EnhancedApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <EnhancedApp>
        <App />
      </EnhancedApp>
    </BrowserRouter>
  </React.StrictMode>,
);
