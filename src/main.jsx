import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Router } from './routes/router.jsx';
import { initializeTheme } from './shared/theme/theme.js';
import './styles.css';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
