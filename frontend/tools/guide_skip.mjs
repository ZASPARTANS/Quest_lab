// Tools that open the page as a returning visitor: the guide (PLAN-017) is already marked "Don't show again", so a modal dialog does not cover the page they look at.
// guide_scenarios.mjs does NOT use this: it checks the first visit itself. Not used by load_timing.mjs either, because a first visit with the guide is the real case there.
import { readFileSync } from 'node:fs';

const KEY = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).guide.storage_key;

/** Sets the "hide the guide" mark before any page script runs in this browser context (also after a reload). */
export const skipGuide = (context) => context.addInitScript((key) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // storage blocked: nothing to set
  }
}, KEY);
