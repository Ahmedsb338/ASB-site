import test from 'node:test';
import assert from 'node:assert/strict';
import { assetlinks, aasa } from '../scripts/build.mjs';
await import('../public/assets/auth.js');   // browser script: attaches to globalThis outside a window
const A = globalThis.ASBAuth;
const c = (u) => { const x = new URL(u); return A.classify(A.parseParams(x.search, x.hash)); };
const B = 'https://asbworkforce.online';

test('recovery / invite fragments -> session', () => {
  assert.deepEqual(c(`${B}/reset-password#access_token=A&refresh_token=R&type=recovery`), { kind: 'session', type: 'recovery', access: 'A' });
  assert.equal(c(`${B}/auth/callback#access_token=A&refresh_token=R&type=invite`).type, 'invite');
});
test('signup and email_change confirmations', () => {
  assert.equal(c(`${B}/auth/callback#access_token=A&refresh_token=R&type=signup`).type, 'signup');
  assert.equal(c(`${B}/auth/callback#access_token=A&refresh_token=R&type=email_change`).type, 'email_change');
  assert.deepEqual(c(`${B}/auth/callback#message=Confirmation+link+accepted&type=email_change`), { kind: 'pending', type: 'email_change' });
});
test('PKCE code', () => assert.deepEqual(c(`${B}/auth/callback?code=XYZ&type=recovery`), { kind: 'code', type: 'recovery', code: 'XYZ' }));
test('errors / expired / garbage', () => {
  assert.deepEqual(c(`${B}/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`), { kind: 'error', reason: 'expired' });
  assert.deepEqual(c(`${B}/reset-password#error=server_error`), { kind: 'error', reason: 'invalid' });
  assert.deepEqual(c(`${B}/reset-password#access_token=A&refresh_token=R&type=bogus`), { kind: 'none' });
  assert.deepEqual(c(`${B}/reset-password`), { kind: 'none' });
});
test('password policy matches the mobile app', () => {
  assert.equal(A.passwordProblem('short1', 'short1'), 'weak');
  assert.equal(A.passwordProblem('longpassword', 'longpassword'), 'weak');
  assert.equal(A.passwordProblem('12345678', '12345678'), 'weak');
  assert.equal(A.passwordProblem('goodpass1', 'goodpass2'), 'mismatch');
  assert.equal(A.passwordProblem('goodpass1', 'goodpass1'), null);
});
test('download only offers non-expired expo.dev builds', () => {
  const now = new Date('2026-11-07');
  assert.equal(A.usableBuild({ url: 'https://expo.dev/artifacts/x.apk', expiresAt: '2026-11-20T00:00:00Z' }, now), true);
  assert.equal(A.usableBuild({ url: 'https://expo.dev/artifacts/x.apk', expiresAt: '2026-11-01T00:00:00Z' }, now), false);
  assert.equal(A.usableBuild({ url: 'https://evil.example/x.apk' }, now), false);
  assert.equal(A.usableBuild(null, now), false);
});
test('association files: nothing invented, strict validation', () => {
  assert.deepEqual(assetlinks('com.asb.workforce.dev', []), []);
  assert.deepEqual(aasa([]), { applinks: { details: [] }, webcredentials: { apps: [] } });
  const fp = Array(32).fill('AB').join(':');
  const a = assetlinks('com.asb.workforce.dev', [fp]);
  assert.equal(a[0].target.package_name, 'com.asb.workforce.dev');
  assert.throws(() => assetlinks('com.asb.workforce.dev', ['abc']));
  assert.throws(() => assetlinks('bad', [fp]));
  assert.throws(() => aasa(['nope']));
  assert.equal(aasa(['ABCDE12345.com.asb.workforce.dev']).webcredentials.apps[0], 'ABCDE12345.com.asb.workforce.dev');
});

test('download supports platform-scoped and legacy metadata', () => {
  const now = new Date('2026-11-08T00:00:00Z');

  assert.equal(A.usableBuild({
    android: {
      url: 'https://expo.dev/artifacts/new.apk',
      expiresAt: '2026-11-20T00:00:00Z'
    },
    ios: null
  }, now), true);

  assert.equal(A.usableBuild({
    android: {
      url: 'https://expo.dev/artifacts/expired.apk',
      expiresAt: '2026-11-01T00:00:00Z'
    },
    ios: null
  }, now), false);

  assert.equal(A.usableBuild({
    android: {
      url: 'https://evil.example/app.apk'
    },
    ios: null
  }, now), false);

  assert.equal(A.usableBuild({
    url: 'https://expo.dev/artifacts/legacy.apk',
    expiresAt: '2026-11-20T00:00:00Z'
  }, now), true);
});
