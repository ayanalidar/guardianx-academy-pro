// Minimal: capture pageErrors + hydration signals from any URL
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
(async () => {
  const url = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('URL:', url);
  console.log('ERRORS:', errors.length ? JSON.stringify(errors, null, 1) : 'NONE');
  await browser.close();
})();
