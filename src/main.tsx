import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Self-hosted (bundled) so the app keeps making zero external requests.
import '@fontsource-variable/archivo/wdth.css';
import './index.css';
import { hydrateNativeStorage, isNativeApp } from './lib/native';

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void hydrateNativeStorage().finally(renderApp);

if (!isNativeApp() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
