import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { App } from './app/App.tsx';
import { AgentkartProvider } from './app/AgentkartContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root-element mangler i index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AgentkartProvider>
          <App />
        </AgentkartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
