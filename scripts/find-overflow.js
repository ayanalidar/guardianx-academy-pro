// Find elements wider than viewport on mobile
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + '/courses', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 || r.right > vw + 2 || r.left < -2) {
        out.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 120),
          w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        });
      }
    });
    return out.slice(0, 25);
  });
  console.log(JSON.stringify(offenders, null, 1));
  await browser.close();
})();
