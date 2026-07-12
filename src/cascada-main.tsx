import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CascadaCatalogPortal from './components/CascadaCatalogPortal';
import './index.css';

const root = document.getElementById('cascada-root');
if (!root) throw new Error('Missing cascada root');

createRoot(root).render(
  <StrictMode>
    <CascadaCatalogPortal />
  </StrictMode>
);
