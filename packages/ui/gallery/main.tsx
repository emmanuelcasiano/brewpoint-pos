import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Gallery } from './Gallery';
import './gallery.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html is missing the #root element.');
}

createRoot(root).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
