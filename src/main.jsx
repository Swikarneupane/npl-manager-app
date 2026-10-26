import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './lib/store.jsx';
import { initStorage } from './lib/storage.js';
import App from './App.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-sans-devanagari/400.css';
import '@fontsource/ibm-plex-sans-devanagari/500.css';
import '@fontsource/ibm-plex-sans-devanagari/600.css';
import '@fontsource-variable/anek-latin/wdth.css';
import '@fontsource-variable/anek-devanagari/wdth.css';
import './styles/npl.css';
import './styles/app.css';

// Load the save file (native file on desktop/Android) before the first render.
initStorage().finally(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <GameProvider><App /></GameProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
