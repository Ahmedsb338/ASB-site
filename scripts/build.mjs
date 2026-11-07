#!/usr/bin/env node
// Static build for Cloudflare Pages: public/ -> dist/, plus generated config.js and association files.
// Env (all public values; NEVER put a service-role/secret key here):
//   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY        -> dist/config.js
//   ANDROID_PACKAGE, ANDROID_SHA256_FINGERPRINTS  -> dist/.well-known/assetlinks.json   (comma-separated)
//   IOS_APP_IDS                                   -> dist/.well-known/apple-app-site-association (TEAMID.bundleId, comma-separated)
// Missing association values leave the safe empty files from public/.well-known (verification simply fails; nothing is invented).
// Use --strict in CI to fail when anything is missing.
import { cpSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const strict = process.argv.includes('--strict');
const env = process.env;
const problems = [];

const list = (v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
export const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
export const APP_ID = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/;
const PKG = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function assetlinks(pkg, fps) {
  if (!pkg || !fps.length) return [];
  if (!PKG.test(pkg)) throw new Error('ANDROID_PACKAGE is not a valid package name');
  for (const f of fps) if (!SHA256.test(f)) throw new Error('ANDROID_SHA256_FINGERPRINTS: expected 32 colon-separated uppercase hex bytes');
  return [{ relation: ['delegate_permission/common.handle_all_urls', 'delegate_permission/common.get_login_creds'],
    target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fps } }];
}
export function aasa(ids) {
  for (const i of ids) if (!APP_ID.test(i)) throw new Error('IOS_APP_IDS: expected TEAMID.bundle.identifier (10-char Team ID)');
  if (!ids.length) return { applinks: { details: [] }, webcredentials: { apps: [] } };
  return {
    applinks: { details: [{ appIDs: ids, components: ['/app', '/reset-password', '/reset-password/*', '/auth/callback', '/auth/callback/*'].map((p) => ({ '/': p })) }] },
    webcredentials: { apps: ids },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  rmSync(dist, { recursive: true, force: true });
  cpSync(join(root, 'public'), dist, { recursive: true });

  const url = env.SUPABASE_URL ?? ''; const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) problems.push('SUPABASE_URL missing/invalid');
  if (!key || key.startsWith('PASTE') || /service_role|sb_secret/.test(key)) problems.push('SUPABASE_PUBLISHABLE_KEY missing/invalid');
  if (/^eyJ/.test(key) && JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString() || '{}').role === 'service_role') throw new Error('Refusing to embed a service-role key');
  writeFileSync(join(dist, 'config.js'), `window.ASB_CONFIG=${JSON.stringify({ supabaseUrl: problems.length ? '' : url, publishableKey: problems.length ? '' : key })};\n`);

  const links = assetlinks(env.ANDROID_PACKAGE, list(env.ANDROID_SHA256_FINGERPRINTS));
  if (!links.length) problems.push('Android assetlinks: ANDROID_PACKAGE / ANDROID_SHA256_FINGERPRINTS not provided (empty file written)');
  mkdirSync(join(dist, '.well-known'), { recursive: true });
  writeFileSync(join(dist, '.well-known', 'assetlinks.json'), JSON.stringify(links, null, 2) + '\n');
  const ids = list(env.IOS_APP_IDS);
  if (!ids.length) problems.push('iOS AASA: IOS_APP_IDS not provided (empty file written)');
  writeFileSync(join(dist, '.well-known', 'apple-app-site-association'), JSON.stringify(aasa(ids), null, 2) + '\n');

  for (const p of problems) console.warn((strict ? 'ERROR: ' : 'WARN: ') + p);
  if (strict && problems.length) process.exit(1);
  console.log('built ->', dist);
}
