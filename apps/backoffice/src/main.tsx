import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { applyTheme, readStoredTheme } from '@brewpoint/ui';
import { App } from './app/App';
import './app/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html is missing the #root element.');
}

// Before the first paint, so a Night shift device never flashes Daylight.
applyTheme(readStoredTheme());

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
