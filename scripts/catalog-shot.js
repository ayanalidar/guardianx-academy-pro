// Catalog overlap inspection: desktop + mobile screenshots
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const base = process.argv[2] || 'https://academy.guardianx.cloud';
  const outDir = '/home/z/my-project/scripts/shots';
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();

  // Desktop — full page
  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/courses', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);
  // scroll to featured card
  await page.evaluate(() => {
    const badge = [...document.querySelectorAll('span,div')].find(e => e.textContent && e.textContent.trim() === '★ FEATURED' && e.children.length === 0);
    if (badge) badge.scrollIntoView({ block: 'start' });
    else window.scrollBy(0, 1200);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outDir + '/catalog-featured-desktop.png' });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outDir + '/catalog-featured-desktop2.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: outDir + '/catalog-top-desktop.png' });
  await page.close();

  // Mobile — featured card area
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + '/courses', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const badge = [...document.querySelectorAll('span,div')].find(e => e.textContent && e.textContent.trim() === '★ FEATURED' && e.children.length === 0);
    if (badge) badge.scrollIntoView({ block: 'start' });
    else window.scrollBy(0, 1600);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outDir + '/catalog-featured-mobile.png' });
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outDir + '/catalog-featured-mobile2.png' });
  await page.close();

  console.log('PAGE ERRORS:', JSON.stringify(errors));
  console.log('DONE');
  await browser.close();
})();
