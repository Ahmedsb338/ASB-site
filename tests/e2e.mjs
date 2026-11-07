// End-to-end browser test of the built site (Playwright + local server applying dist/_headers). Supabase Auth is mocked.
import { createRequire } from 'node:module';
// Playwright is a dev-machine tool (not a project dependency): resolve it from the global install.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const SB = 'https://lwbyjnzpmtlflhsywtcw.supabase.co';
execFileSync('node', ['scripts/build.mjs'], { env: { ...process.env, SUPABASE_URL: SB, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_E2E_DUMMY_KEY' }, stdio: 'inherit' });
const srv = spawn('node', ['scripts/serve.mjs', 'dist', '8788'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const O = 'http://localhost:8788';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + e.message.split('\n')[0]]); } };

const browser = await chromium.launch();
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, ...opts });
  const page = await ctx.newPage(); const csp = []; const sbCalls = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) csp.push(m.text()); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request(); sbCalls.push({ method: req.method(), auth: req.headers()['authorization'], apikey: req.headers()['apikey'], body: req.postData() });
    const token = (req.headers()['authorization'] || '').replace('Bearer ', '');
    const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: h });
    if (token === 'EXPIRED') return route.fulfill({ status: 401, headers: h, contentType: 'application/json', body: '{"msg":"invalid JWT"}' });
    return route.fulfill({ status: 200, headers: h, contentType: 'application/json', body: '{"id":"u"}' });
  });
  return { page, csp, sbCalls, ctx };
}

await check('root shows the landing page (no blind redirect) and links to /app and /download', async () => {
  const { page, csp } = await newPage(); await page.goto(O + '/');
  assert.equal(new URL(page.url()).pathname, '/');
  assert.match(await page.locator('h1').first().textContent(), /Attendance that the server verifies/);
  assert.equal(await page.locator('a[href="/app"]').count() > 0, true); assert.equal(await page.locator('a[href="/download"]').count() > 0, true);
  assert.deepEqual(csp, []);
});
await check('/app entry page renders with open-app deep link + download link', async () => {
  const { page, csp } = await newPage(); await page.goto(O + '/app');
  assert.equal(await page.getAttribute('a.btn', 'href'), 'asbworkforce://'); assert.equal(await page.locator('a[href="/download"]').count(), 1); assert.deepEqual(csp, []);
});
await check('reset-password: valid recovery link -> weak/mismatch rejected -> success PUT with bearer + apikey; hash cleared', async () => {
  const { page, csp, sbCalls } = await newPage();
  await page.goto(O + '/reset-password#access_token=TOK123&refresh_token=R&type=recovery');
  await page.waitForSelector('#form:not([hidden])');
  assert.equal(new URL(page.url()).hash, ''); assert.equal(sbCalls[0].method, 'GET'); assert.equal(sbCalls[0].auth, 'Bearer TOK123');
  await page.fill('#pw', 'short'); await page.fill('#pw2', 'short'); await page.click('#go');
  assert.match(await page.textContent('#status'), /at least 8/);
  await page.fill('#pw', 'goodpass1'); await page.fill('#pw2', 'goodpass2'); await page.click('#go');
  assert.match(await page.textContent('#status'), /do not match/);
  assert.equal(sbCalls.filter((c) => c.method === 'PUT').length, 0);
  await page.fill('#pw2', 'goodpass1'); await page.click('#go');
  await page.waitForFunction(() => /updated/.test(document.getElementById('status').textContent));
  const put = sbCalls.find((c) => c.method === 'PUT'); assert.deepEqual(JSON.parse(put.body), { password: 'goodpass1' });
  assert.equal(put.auth, 'Bearer TOK123'); assert.equal(put.apikey, 'sb_publishable_E2E_DUMMY_KEY');
  assert.equal(await page.isHidden('#form'), true); assert.deepEqual(csp, []);
});
await check('reset-password: expired link (error fragment) and revoked token (401) show expired; no form', async () => {
  let r = await newPage(); await r.page.goto(O + '/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await r.page.waitForSelector('#status:not([hidden])'); assert.match(await r.page.textContent('#status'), /expired/); assert.equal(await r.page.isHidden('#form'), true); assert.equal(r.sbCalls.length, 0);
  r = await newPage(); await r.page.goto(O + '/reset-password#access_token=EXPIRED&refresh_token=R&type=recovery');
  await r.page.waitForFunction(() => /expired/.test(document.getElementById('status').textContent)); assert.equal(await r.page.isHidden('#form'), true);
});
await check('reset-password: no link / PKCE code / signup token never show the form', async () => {
  let r = await newPage(); await r.page.goto(O + '/reset-password'); assert.match(await r.page.textContent('#status'), /invalid/); assert.equal(await r.page.isHidden('#form'), true);
  r = await newPage(); await r.page.goto(O + '/reset-password?code=ABC&type=recovery'); assert.equal(await r.page.isHidden('#form'), true);
  assert.match(await r.page.getAttribute('#inapp', 'href'), /^asbworkforce:\/\/reset-password\?code=ABC/); assert.equal(r.sbCalls.length, 0);
  r = await newPage(); await r.page.goto(O + '/reset-password#access_token=A&refresh_token=R&type=signup'); assert.equal(await r.page.isHidden('#form'), true); assert.equal(r.sbCalls.length, 0);
});
await check('auth/callback: recovery and invite forward to /reset-password with fragment', async () => {
  for (const type of ['recovery', 'invite']) {
    const { page } = await newPage(); await page.goto(O + `/auth/callback#access_token=TOK&refresh_token=R&type=${type}`);
    await page.waitForSelector('#form:not([hidden])'); assert.equal(new URL(page.url()).pathname, '/reset-password');
  }
});
await check('auth/callback: signup + email_change confirmed, pending leg, expired error, bad link; tokens discarded, no network', async () => {
  for (const [frag, re] of [['access_token=A&refresh_token=R&type=signup', /confirmed/], ['access_token=A&refresh_token=R&type=email_change', /confirmed/],
      ['message=Confirmation+link+accepted&type=email_change', /other email/], ['error=access_denied&error_code=otp_expired', /expired/], ['', /invalid/]]) {
    const { page, sbCalls, csp } = await newPage(); await page.goto(O + '/auth/callback' + (frag ? '#' + frag : ''));
    await page.waitForSelector('#status:not([hidden])'); assert.match(await page.textContent('#status'), re);
    assert.equal(new URL(page.url()).hash, ''); assert.equal(sbCalls.length, 0); assert.deepEqual(csp, []);
  }
});
await check('download: offers valid build, hides expired build', async () => {
  let r = await newPage(); await r.page.goto(O + '/download'); await r.page.waitForSelector('#apk:not([hidden])'); assert.match(await r.page.getAttribute('#apk', 'href'), /^https:\/\/expo\.dev\//);
  r = await newPage(); await r.page.route('**/latest.json', (x) => x.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '1', url: 'https://expo.dev/a.apk', createdAt: '2026-01-01', expiresAt: '2026-01-02' }) }));
  await r.page.goto(O + '/download'); await r.page.waitForFunction(() => /being prepared/.test(document.getElementById('meta').textContent)); assert.equal(await r.page.isHidden('#apk'), true);
});
await check('Arabic toggle sets RTL; no horizontal scroll at 320px', async () => {
  const { page } = await newPage({ viewport: { width: 320, height: 640 } }); await page.goto(O + '/app'); await page.click('#lang');
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
});
await check('well-known files served as JSON and parse', async () => {
  const { page } = await newPage();
  for (const f of ['assetlinks.json', 'apple-app-site-association']) { const r = await page.request.get(`${O}/.well-known/${f}`); assert.equal(r.status(), 200); assert.match(r.headers()['content-type'], /json/); JSON.parse(await r.text()); }
});
await browser.close(); srv.kill();
for (const [s, n] of results) console.log(s, '-', n);
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
