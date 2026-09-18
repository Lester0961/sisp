import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\LESTER\\.gemini\\antigravity\\brain\\17ca4b87-266f-4f88-ac15-2da6dd24b2ee';

async function run() {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'admin@rmc.edu.ph');
  await page.fill('input[type="password"]', 'local-demo-only');
  await page.click('button[type="submit"]');

  console.log('Waiting for admin dashboard...');
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Take Expanded Screenshot
  const expandedPath = path.join(ARTIFACT_DIR, 'admin_dashboard_expanded.png');
  await page.screenshot({ path: expandedPath });
  console.log('Saved:', expandedPath);

  // Click minimize toggle
  const toggleBtn = page.locator('button[title*="Minimize"]');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForTimeout(600);
    const minimizedPath = path.join(ARTIFACT_DIR, 'admin_dashboard_minimized.png');
    await page.screenshot({ path: minimizedPath });
    console.log('Saved:', minimizedPath);
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
