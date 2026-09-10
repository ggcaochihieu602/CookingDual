const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://localhost:5173/?test=1');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'artifacts/menu-desktop.png' });
  console.log(JSON.stringify({ errors, state: await page.evaluate(() => window.__cookingdual?.state().phase), buttons: await page.locator('button:visible').allTextContents() }));
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click();
  await page.waitForFunction(() => window.__cookingdual.game.phase === 'playing');
  await page.screenshot({ path: 'artifacts/gameplay-desktop.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
