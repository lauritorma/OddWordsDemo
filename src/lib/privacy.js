export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

/** Shared by the static build and local preview; never inject unescaped config. */
export function operatorContact({ operatorName, privacyEmail }) {
  const name = typeof operatorName === 'string' ? operatorName.trim() : '';
  const email = typeof privacyEmail === 'string' ? privacyEmail.trim() : '';
  const validEmail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email) && !/[?&#:%]/.test(email);
  return `<p>Site operator: <strong>${escapeHtml(name || 'The site publisher')}</strong>.</p>` +
    (validEmail ? `<p>For privacy questions or requests, contact <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>.</p>` : '<p>Operator contact details have not been configured for this deployment.</p>');
}
