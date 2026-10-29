import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Deliberately no product UI yet: this delivery is setup and implementation plans.
const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<StrictMode><App/></StrictMode>);
