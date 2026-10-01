// Renders icons/*.png from tools/icon.html. Run: node tools/make-icons.mjs (needs a local server on :8080)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180]]) {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
  await page.goto('http://localhost:8080/tools/icon.html');
  await page.waitForFunction(() => window.done);
  await page.locator('#c').screenshot({ path: `icons/${name}.png` });
  await page.close();
}
await browser.close();
