import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { runSeed } from './repositories/seed/index';
import { removeItem } from './utils/storage';
removeItem('staff');
runSeed();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
