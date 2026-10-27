import { clearSave } from './lib/storage.js';
import { operatorContact } from './lib/privacy.js';
import { siteConfig } from './site-config.js';

// The production build also embeds these details for visitors without JS.
document.querySelector('#operator-contact').innerHTML = operatorContact(siteConfig);
const button = document.querySelector('#clear-saved-data');
const dialog = document.querySelector('#privacy-dialog');
button.hidden = false;
button.addEventListener('click', () => dialog.showModal());
document.querySelector('#cancel-clear').addEventListener('click', () => dialog.close());
document.querySelector('#confirm-clear').addEventListener('click', () => {
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const cleared = clearSave(storage);
  dialog.close();
  document.querySelector('#privacy-status').textContent = cleared
    ? 'Saved game data cleared from this browser. New activity in the game will be saved again.'
    : 'Your browser blocked storage access. Clear this site\'s data in your browser settings instead.';
});
dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
