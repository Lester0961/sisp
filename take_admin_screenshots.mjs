import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\LESTER\\.gemini\\antigravity\\brain\\17ca4b87-266f-4f88-ac15-2da6dd24b2ee';

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // 1. Log in as Admin Staff
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@rmc.edu.ph');
  await page.type('input[type="password"]', 'local-demo-only');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to admin dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  // Take Admin Dashboard Expanded Screenshot
  const expandedPath = path.join(ARTIFACT_DIR, 'admin_dashboard_expanded.png');
  await page.screenshot({ path: expandedPath });
  console.log('Captured Admin Dashboard (Expanded):', expandedPath);

  // Click the minimize toggle button
  const toggleBtn = await page.$('button[title*="Minimize"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    const collapsedPath = path.join(ARTIFACT_DIR, 'admin_dashboard_minimized.png');
    await page.screenshot({ path: collapsedPath });
    console.log('Captured Admin Dashboard (Minimized):', collapsedPath);
  }

  await browser.close();
}

run().catch(console.error);
