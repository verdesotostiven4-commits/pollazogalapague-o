import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LogisticsLab from './components/LogisticsLab';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogisticsLab />
  </StrictMode>
);
