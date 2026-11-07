/* Pure auth-link helpers (no DOM). Loaded in the browser as window.ASBAuth and in Node tests via require(). */
(function (root) {
  'use strict';
  var SESSION_TYPES = ['invite', 'recovery', 'signup', 'email_change', 'magiclink'];

  function parseParams(search, hash) {
    var out = {};
    [search || '', hash || ''].forEach(function (seg) {
      seg = seg.replace(/^[?#]/, '');
      if (!seg) return;
      new URLSearchParams(seg).forEach(function (v, k) { out[k] = v; });
    });
    return out;
  }

  /** -> {kind:'error',reason} | {kind:'session',type,access,refresh} | {kind:'code',type,code} | {kind:'pending',type} | {kind:'none'} */
  function classify(p) {
    if (p.error || p.error_code) {
      var s = ((p.error_code || '') + ' ' + (p.error_description || '')).toLowerCase();
      return { kind: 'error', reason: /expired|otp_expired/.test(s) ? 'expired' : 'invalid' };
    }
    var type = SESSION_TYPES.indexOf(p.type) >= 0 ? p.type : null;
    if (p.access_token && p.refresh_token !== undefined && type) return { kind: 'session', type: type, access: p.access_token };
    if (p.code) return { kind: 'code', type: type, code: p.code };
    if (p.message && p.type === 'email_change') return { kind: 'pending', type: 'email_change' };
    return { kind: 'none' };
  }

  /** Same policy as the mobile app: >= 8 chars, at least one letter and one digit. */
  function passwordProblem(a, b) {
    if (!(a.length >= 8 && /[A-Za-z]/.test(a) && /\d/.test(a))) return 'weak';
    if (a !== b) return 'mismatch';
    return null;
  }

  /** Accept current platform-scoped and legacy APK metadata; Expo links only. */
  function usableBuild(j, now) {
    var b = j && (j.android || j);
    return !!(b && typeof b.url === 'string' && /^https:\/\/expo\.dev\//.test(b.url) && (!b.expiresAt || new Date(b.expiresAt) > (now || new Date())));
  }

  var api = { parseParams: parseParams, classify: classify, passwordProblem: passwordProblem, usableBuild: usableBuild };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ASBAuth = api;
})(typeof window !== 'undefined' ? window : globalThis);
