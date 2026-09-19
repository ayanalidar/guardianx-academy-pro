// Verify new spotlight loop carousel on sandbox: animation + no overlap
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const base = process.argv[2] || 'http://localhost:3000';
  const outDir = '/home/z/my-project/scripts/shots';
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();

  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/courses', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);

  // Scroll spotlight into view
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => x.textContent && x.textContent.includes('Trending now'));
    if (h) h.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(2000);

  // Check marquee transform is animating (sample twice)
  const t1 = await page.evaluate(() => {
    const el = document.querySelector('[class*="animate-[scroll"]');
    return el ? getComputedStyle(el).transform : 'NOT FOUND';
  });
  await page.waitForTimeout(1500);
  const t2 = await page.evaluate(() => {
    const el = document.querySelector('[class*="animate-[scroll"]');
    return el ? getComputedStyle(el).transform : 'NOT FOUND';
  });
  console.log('MARQUEE t1:', t1);
  console.log('MARQUEE t2:', t2);
  console.log('MARQUEE ANIMATING:', t1 !== t2 && t1 !== 'NOT FOUND');

  // Card overlap check: count spotlight cards + ensure no horizontal doc overflow
  const cardCount = await page.evaluate(() => document.querySelectorAll('button[aria-label][class*="h-[400px]"]').length);
  const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const Chinese = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].map(i => i.src).filter(s => s.includes('security-management'));
    return { secMgrImgs: imgs.length, sample: imgs[0] || null };
  });
  console.log('SPOTLIGHT CARDS (doubled):', cardCount);
  console.log('DOC H-OVERFLOW px:', docOverflow);
  console.log('SEC-MGMT IMG:', JSON.stringify(Chinese));

  await page.screenshot({ path: outDir + '/new-spotlight-desktop.png' });
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: outDir + '/new-grid-desktop.png' });
  await page.close();

  // Mobile
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + '/courses', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => x.textContent && x.textContent.includes('Trending now'));
    if (h) h.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(1800);
  const mobOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('MOBILE H-OVERFLOW px:', mobOverflow);
  await page.screenshot({ path: outDir + '/new-spotlight-mobile.png' });
  await page.close();

  console.log('PAGE ERRORS:', JSON.stringify(errors));
  console.log('DONE');
  await browser.close();
})();
