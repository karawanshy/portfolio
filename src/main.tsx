import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';
import { installHistory, resolveRoute } from './router/router';
import { returnOnPopstate } from './router/transition';

// Browser Back from the Story plays the orb transition onto the link it was opened from.
installHistory({ returnTransition: returnOnPopstate });

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.mjs) → hydrate. Dev → client render.
// If a host served another route's HTML for this path, render fresh instead of hydrating.
const current = resolveRoute(window.location.pathname) ?? 'portfolio';
if (root.hasChildNodes() && root.dataset.route === current) {
  hydrateRoot(root, app);
} else {
  root.textContent = '';
  createRoot(root).render(app);
}
