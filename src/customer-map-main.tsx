import React from 'react';
import ReactDOM from 'react-dom/client';
import CustomerTrackingMapLab from './components/CustomerTrackingMapLab';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <CustomerTrackingMapLab />
  </React.StrictMode>
);
