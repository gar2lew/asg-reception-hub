import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { runSeed } from './repositories/seed/index';
import { removeItem } from './utils/storage';

// Force staff seed to ensure login accounts exist
removeItem('staff');
(async () => { await runSeed(); })();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

