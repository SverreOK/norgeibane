// Loads js/config.js (the user's local copy) and falls back to
// js/config.example.js if it doesn't exist, so a fresh checkout still runs.

import defaults from './config.example.js';

let user = {};
try {
  user = (await import('./config.js')).default ?? {};
} catch {
  console.info('js/config.js not found — using defaults (no Ion token).');
}

export const config = { ...defaults, ...user };
