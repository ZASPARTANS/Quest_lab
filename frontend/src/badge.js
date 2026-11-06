// Shows a small badge on the testing site (the Vite dev server). The production build never shows it (decision D19).
import cfg from '../../config/frontend.json';

const badge = document.getElementById('env-badge');
if (badge && import.meta.env.DEV && cfg.dev_badge.enabled) {
  badge.textContent = cfg.dev_badge.text;
  badge.hidden = false;
}
